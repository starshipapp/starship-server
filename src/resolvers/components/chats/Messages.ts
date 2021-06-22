import Attachments, { IAttachment } from "../../../database/Attachments";
import Channels, { IChannel } from "../../../database/components/chat/Channels";
import Messages, { IMessage } from "../../../database/components/chat/Messages";
import Planets from "../../../database/Planets";
import Users, { IUser } from "../../../database/Users";
import Context from "../../../util/Context";
import getMentions from "../../../util/getMentions";
import permissions from "../../../util/permissions";
import PubSubContainer from "../../../util/PubSubContainer";

const fieldResolvers = {
  owner: async (root: IMessage, args: undefined, context: Context): Promise<IUser> => {
    return context.loaders.userLoader.load(root.owner);
  },
  channel: async (root: IMessage, args: undefined, context: Context): Promise<IChannel> => {
    return context.loaders.channelLoader.load(root.channel);
  },
  mentions: async (root: IMessage, args: undefined, context: Context): Promise<IUser[]> => {
    const loaded = await context.loaders.userLoader.loadMany(root.mentions);
    return loaded as IUser[];
  },
  parent: async (root: IMessage, args: undefined, context: Context): Promise<IMessage | null> => {
    if(root.parent) {
      return context.loaders.messageLoader.load(root.parent);
    }
  },
  attachments: async (root: IMessage, args: undefined, context: Context): Promise<IAttachment[] | null> => {
    if(root.attachments) {
      const loaded = await context.loaders.attachmentLoader.loadMany(root.attachments);
      return loaded as IAttachment[];
    }
  }
};

interface IMessageArgs {
  id: string
}

async function message(root: undefined, args: IMessageArgs, context: Context): Promise<IMessage> {
  const message = await Messages.findOne({_id: args.id});
  if(message != undefined) {
    const channel = await Channels.findOne({_id: message.channel});
    if(channel.componentId) {
      if(await permissions.checkReadPermission(context.user?.id ?? null, channel.planet)) {
        return message;
      } else {
        throw new Error("Not found.");
      }
    } else {
      if(context.user.id && (channel.owner == context.user.id || channel.users.includes(context.user.id))) {
        return message;
      } else {
        throw new Error("Not found.");
      }
    }
  } else {
    throw new Error("Not found.");
  }
}

interface ISendMessageArgs {
  channelId: string,
  content: string,
  attachments?: [string],
  replyTo?: string,
}

async function sendMessage(root: undefined, args: ISendMessageArgs, context: Context): Promise<IMessage> {
  const channel = await Channels.findOne({_id: args.channelId});
  if(channel != undefined) {
    if(context.user.id) {
      // permission checks
      const user = await Users.findOne({_id: context.user.id});
      if(channel.planet) {
        if(!(await permissions.checkPublicWritePermission(channel.planet, context.user.id))) {
          throw new Error("Not found.");
        }
        if(!user.following.includes(channel.planet)) {
          throw new Error("You can only send messages in followed planets.");
        }
      } else {
        if(!(channel.owner == context.user.id || channel.users.includes(context.user.id))) {
          throw new Error("Not found.");
        }
      }

      // validation
      if(args.attachments) {
        if(args.attachments.length > 5) {
          throw new Error("Too many attachments. You may only have up to 5 attachments.");
        }
        const attachments = await Attachments.find({_id: {$in: args.attachments}});
        if(attachments.length !== args.attachments.length) {
          throw new Error("One or more attachments is missing.");
        }
      }

      if(args.replyTo) {
        const message = await Messages.findOne({_id: args.replyTo});
        if(!message) {
          throw new Error("The message you are trying to reply to does not exist.");
        }
      }
      
      if(args.content.length > 2000) {
        throw new Error("Your message is too long. It can only be 2000 characters.");
      }

      // mentions
      const url = channel.planet ? `/planet/${channel.planet}/${channel.componentId}/${channel._id}` : `/messages/${channel._id}`;
      const mentionString = `[${channel.name}](${process.env.SITE_URL}/${url})`;
      const planet = channel.planet ? await Planets.findOne({_id: channel.planet}) : null; 
      const mentions = getMentions(args.content, user, mentionString, planet); 

      // create message
      const message = new Messages({
        createdAt: Date.now(),
        content: args.content,
        pinned: false,
        edited: false,
        channel: args.channelId,
        owner: context.user.id,
        mentions,
        reactions: [],
        parent: args.replyTo,
        attachments: args.attachments
      });

      await message.save();

      await PubSubContainer.pubSub.publish("MESSAGE_RECIEVED", {
        messageRecieved: message,
        planet,
        channel
      });

      return message;
    } else {
      throw new Error("Not found.");
    }
  } else {
    throw new Error("Not found.");
  }
}

interface IEditMessageArgs {
  messageId: string,
  content: string
}

async function editMessage(root: undefined, args: IEditMessageArgs, context: Context): Promise<IMessage> {
  const message = await Messages.findOne({_id: args.messageId});
  if(message) {
    if(message.owner != context.user.id) {
      const channel = await Channels.findOne({_id: message.channel});
      if(channel.planet) {
        if(!(await permissions.checkFullWritePermission(context.user.id, channel.planet))) {
          throw new Error("Not found.");
        }
      } else {
        throw new Error("Not found.");
      }
    }
    return Messages.findOneAndUpdate({_id: args.messageId}, {$set: {content: args.content, edited: true}}, {new: true});
  } else {
    throw new Error("Not found.");
  }
}

interface ISimpleMessageArgs {
  messageId: string
}


async function deleteMessage(root: undefined, args: ISimpleMessageArgs, context: Context): Promise<boolean> {
  const message = await Messages.findOne({_id: args.messageId});
  if(message) {
    if(message.owner != context.user.id) {
      const channel = await Channels.findOne({_id: message.channel});
      if(channel.planet) {
        if(!(await permissions.checkFullWritePermission(context.user.id, channel.planet))) {
          throw new Error("Not found.");
        }
      } else {
        throw new Error("Not found.");
      }
      await Messages.deleteOne({_id: args.messageId});
      return true;
    }
  } else {
    throw new Error("Not found.");
  }
}

async function pinMessage(root: undefined, args: ISimpleMessageArgs, context: Context): Promise<IMessage> {
  const message = await Messages.findOne({_id: args.messageId});
  if(message) {
    const channel = await Channels.findOne({_id: message.channel});
    if(channel.planet) {
      if(!(await permissions.checkFullWritePermission(context.user.id, channel.planet))) {
        throw new Error("Not found.");
      }
    } else if(channel.owner != context.user.id && !channel.users.includes(context.user.id)) {
      throw new Error("Not found.");
    }
    return Messages.findOneAndUpdate({_id: args.messageId}, {$set: {pinned: true}}, {new: true});
  } else {
    throw new Error("Not found.");
  }
}

export default {fieldResolvers, pinMessage, deleteMessage, editMessage, sendMessage, message};