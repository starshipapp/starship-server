import { withFilter } from "apollo-server-express";
import Attachments, { IAttachment } from "../../../database/Attachments";
import Channels, { IChannel } from "../../../database/components/chat/Channels";
import Messages, { IMessage } from "../../../database/components/chat/Messages";
import Planets, { IPlanet } from "../../../database/Planets";
import Users, { IUser } from "../../../database/Users";
import Context from "../../../util/Context";
import getMentions from "../../../util/getMentions";
import permissions from "../../../util/permissions";
import emoji from "node-emoji";
import PubSubContainer from "../../../util/PubSubContainer";
import CustomEmojis from "../../../database/CustomEmojis";

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

interface IMessageSentPayload {
  messageSent: IMessage;
  planet: IPlanet;
  channel: IChannel;
}

interface IMessageSentArgs {
  channelId: string;
}

const messageSent = {
  subscribe: withFilter(() => PubSubContainer.pubSub.asyncIterator<IMessageSentPayload>("MESSAGE_SENT"), async (payload: IMessageSentPayload, args: IMessageSentArgs, context: Context) => {
    if(payload.channel._id == args.channelId) {
      let permission = false;
      if((payload.planet && await permissions.checkReadPermission(context.user?.id ?? null, payload.planet)) 
        || (!payload.planet && payload.channel.owner == context.user?.id)
        || (payload.channel.users.includes(context.user.id))
      ) {
        permission = true;
      }
      return permission;
    }
    return false;
  })
};

interface IMessageRemovedPayload {
  messageRemoved: IMessage;
  planet: IPlanet;
  channel: IChannel;
}

interface IMessageRemovedArgs {
  channelId: string;
}

const messageRemoved = {
  subscribe: withFilter(() => PubSubContainer.pubSub.asyncIterator<IMessageRemovedPayload>("MESSAGE_REMOVED"), async (payload: IMessageRemovedPayload, args: IMessageRemovedArgs, context: Context) => {
    if(payload.channel._id == args.channelId) {
      let permission = false;
      if((payload.planet && await permissions.checkReadPermission(context.user?.id ?? null, payload.planet)) 
        || (!payload.planet && payload.channel.owner == context.user?.id)
        || (payload.channel.users.includes(context.user.id))
      ) {
        permission = true;
      }
      return permission;
    }
    return false;
  })
};

interface IMessageUpdatedPayload {
  messageUpdated: IMessage;
  planet: IPlanet;
  channel: IChannel;
}

interface IMessageUpdatedArgs {
  channelId: string;
}

const messageUpdated = {
  subscribe: withFilter(() => PubSubContainer.pubSub.asyncIterator<IMessageUpdatedPayload>("MESSAGE_UPDATED"), async (payload: IMessageUpdatedPayload, args: IMessageUpdatedArgs, context: Context) => {
    if(payload.channel._id == args.channelId) {
      let permission = false;
      if((payload.planet && await permissions.checkReadPermission(context.user?.id ?? null, payload.planet)) 
        || (!payload.planet && payload.channel.owner == context.user?.id)
        || (payload.channel.users.includes(context.user.id))
      ) {
        permission = true;
      }
      return permission;
    }
    return false;
  })
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

      await PubSubContainer.pubSub.publish("MESSAGE_SENT", {
        messageSent: message,
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

    let planet: (IPlanet | null) = null;
    const channel = await Channels.findOne({_id: message.channel});
    if(message.owner != context.user.id) {
      if(channel.planet) {
        planet = await Planets.findOne({_id: channel.planet});

        if(!(await permissions.checkFullWritePermission(context.user.id, planet))) {
          throw new Error("Not found.");
        }
      } else {
        throw new Error("Not found.");
      }
    }
    const returnMessage = Messages.findOneAndUpdate({_id: args.messageId}, {$set: {content: args.content, edited: true}}, {new: true});

    await PubSubContainer.pubSub.publish("MESSAGE_UPDATED", {
      messageUpdated: returnMessage,
      planet,
      channel
    });

    return returnMessage;
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
      let planet: (IPlanet | null) = null;
      if(channel.planet) {
        planet = await Planets.findOne({_id: channel.planet});

        if(!(await permissions.checkFullWritePermission(context.user.id, planet))) {
          throw new Error("Not found.");
        }
      } else {
        throw new Error("Not found.");
      }
      await Messages.deleteOne({_id: args.messageId});

      await PubSubContainer.pubSub.publish("MESSAGE_DELETED", {
        messageDeleted: message,
        planet,
        channel
      });

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
    let planet: (IPlanet | null) = null;
    if(channel.planet) {
      planet = await Planets.findOne({_id: channel.planet});

      if(!(await permissions.checkFullWritePermission(context.user.id, planet))) {
        throw new Error("Not found.");
      }
    } else if(channel.owner != context.user.id && !channel.users.includes(context.user.id)) {
      throw new Error("Not found.");
    }

    const returnMessage =  Messages.findOneAndUpdate({_id: args.messageId}, {$set: {pinned: !message.pinned}}, {new: true});

    await PubSubContainer.pubSub.publish("MESSAGE_UPDATED", {
      messageUpdated: returnMessage,
      planet,
      channel
    });

    return returnMessage;
  } else {
    throw new Error("Not found.");
  }
}

// react to a message
interface IReactToMessageArgs {
  messageId: string,
  emojiId: string
}

async function reactToMessage(root: undefined, args: IReactToMessageArgs, context: Context): Promise<IMessage> {
  const message = await Messages.findOne({_id: args.messageId});
  if(message) {
    const channel = await Channels.findOne({_id: message.channel});
    const planet = await Planets.findOne({_id: channel.planet});
    let permission = false;
    if(planet) {
      permission = (await permissions.checkPublicWritePermission(context.user.id, planet));
    } else if ((channel.owner == context.user?.id)|| (channel.users.includes(context.user.id))) {
      permission = true;
    }
  
    if(permission) {
      if(emoji.hasEmoji(args.emojiId) || args.emojiId.startsWith("ceid:")) {
        const reaction = message.reactions.find(r => r.emoji == args.emojiId);
        let returnMessage: (IMessage | null) = null;

        if(reaction) {
          if(reaction.reactors.includes(context.user.id)) {
            if(reaction.reactors.length === 1) {
              returnMessage = await Messages.findOneAndUpdate({_id: args.messageId}, {$pull: {reactions: reaction}}, {new: true});
            } else {
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              returnMessage = await Messages.findOneAndUpdate({_id: args.messageId, reactions: {$elemMatch: {emoji: args.emojiId}}}, {$pull: {"reactions.$.reactors": context.user.id}}, {new: true});
            }
          } else {
            returnMessage = await Messages.findOneAndUpdate({_id: args.messageId, reactions: {$elemMatch: {emoji: args.emojiId}}}, {$push: {"reactions.$.reactors": context.user.id}}, {new: true});
          }
        } else {
          // format for custom emojis is ceid:id
          if(args.emojiId.startsWith("ceid:")) {
            const emoji = args.emojiId.split(":");
            const emojiObject = await CustomEmojis.findOne({_id: emoji[1]});
            if(!emojiObject) {
              throw new Error("Invalid custom emoji.");
            }
          }
          returnMessage = await Messages.findOneAndUpdate({_id: args.messageId}, {$push: {reactions: {emoji: args.emojiId, reactors: [context.user.id]}}}, {new: true});
        }


        await PubSubContainer.pubSub.publish("MESSAGE_UPDATED", {
          messageUpdated: returnMessage,
          planet,
          channel
        });

        return returnMessage;
      } else {
        throw new Error("Invalid emoji.");
      }
    } else {
      throw new Error("Not found.");
    }
  } else {
    throw new Error("Not found.");
  }
}
              

export default {fieldResolvers, messageSent, messageRemoved, messageUpdated, reactToMessage, pinMessage, deleteMessage, editMessage, sendMessage, message};