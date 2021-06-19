import { IAttachment } from "../../../database/Attachments";
import Channels, { IChannel } from "../../../database/components/chat/Channels";
import Messages, { IMessage } from "../../../database/components/chat/Messages";
import { IUser } from "../../../database/Users";
import Context from "../../../util/Context";
import permissions from "../../../util/permissions";

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

export default {message, fieldResolvers};