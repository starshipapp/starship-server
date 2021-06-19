import { FilterQuery } from "mongoose";
import Channels, { IChannel } from "../../../database/components/chat/Channels";
import Chats, { IChat } from "../../../database/components/chat/Chats";
import Messages, { IMessage } from "../../../database/components/chat/Messages";
import { IPlanet } from "../../../database/Planets";
import { IUser } from "../../../database/Users";
import ChannelTypes from "../../../util/ChannelTypes";
import Context from "../../../util/Context";
import IMessageFeed from "../../../util/feeds/IMessageFeed";
import permissions from "../../../util/permissions";

interface IMessageResolverArgs {
  limit?: number,
  cursor?: string
}

const fieldResolvers = {
  owner: async (root: IChannel, args: undefined, context: Context): Promise<IUser> => {
    return context.loaders.userLoader.load(root.owner);
  },
  planet: async (root: IChannel, args: undefined, context: Context): Promise<IPlanet | null> => {
    if(root.planet) {
      return context.loaders.planetLoader.load(root.planet);
    }
  },
  component: async (root: IChannel, args: undefined, context: Context): Promise<IChat | null> => {
    if(root.componentId) {
      return context.loaders.chatLoader.load(root.componentId);
    }
  },
  users: async (root: IChannel, args: undefined, context: Context): Promise<IUser[] | null> => {
    if(root.users) {
      return (await context.loaders.userLoader.loadMany(root.users)) as IUser[];
    }
  },
  messages: async (root: IChannel, args: IMessageResolverArgs): Promise<IMessageFeed> => {
    const limit = args.limit > 100 ? 100 : args.limit;
    const filter: FilterQuery<IMessage> = {channel: root._id};

    if(args.cursor) {
      const date = new Date(args.cursor);
      filter.createdAt = {$gt: date};
    }

    const documents = await Messages.find(filter).sort({ createdAt: -1 }).limit(limit);

    return {
      messages: documents,
      cursor: String(documents[0].createdAt)
    };
  },
  pinnedMessages: async (root: IChannel, args: IMessageResolverArgs): Promise<IMessageFeed> => {
    const limit = args.limit > 25 ? 25 : args.limit;
    const filter: FilterQuery<IMessage> = {channel: root._id, pinned: true};

    if(args.cursor) {
      const date = new Date(args.cursor);
      filter.createdAt = {$gt: date};
    }

    const documents = await Messages.find(filter).sort({ createdAt: 1 }).limit(limit);

    return {
      messages: documents,
      cursor: String(documents[documents.length - 1].createdAt)
    };
  },
  // TODO: implement unread support
  unread: () => false,
  mentioned: () => false,
  lastRead: () => ""
};

interface IChannelArgs {
  id: string
}

async function channel(root: undefined, args: IChannelArgs, context: Context): Promise<IChannel> {
  const channel = await Channels.findOne({_id: args.id});
  if(channel != undefined) {
    if(await permissions.checkReadPermission(context.user?.id ?? null, channel.planet)) {
      return channel;
    } else {
      throw new Error("Not found.");
    }
  } else {
    throw new Error("Not found.");
  }
}

interface ICreateChannelArgs {
  chatId: string,
  name: string
}

async function createChannel(root: undefined, args: ICreateChannelArgs, context: Context): Promise<IChannel> {
  const chat = await Chats.findOne({_id: args.chatId});
  if(chat != undefined) {
    if(await permissions.checkFullWritePermission(context.user.id, chat.planet)) {
      const channel = new Channels({
        name: args.name,
        type: ChannelTypes.textChannel,
        topic: "",
        createdAt: new Date(),
        componentId: args.chatId,
        planet: chat.planet,
        owner: context.user.id,
      });

      return channel.save();
    } else {
      throw new Error("Not found.");
    }
  } else {
    throw new Error("Chat not found.");
  }
}

interface IRenameChannelArgs {
  channelId: string,
  name: string
}

async function renameChannel(root: undefined, args: IRenameChannelArgs, context: Context): Promise<IChannel> {
  const channel = await Channels.findOne({_id: args.channelId});
  if(channel != undefined) {
    if(await permissions.checkFullWritePermission(context.user.id, channel.planet)) {
      return Channels.findOneAndUpdate({_id: args.channelId}, {$set: {name: args.name}}, {new: true});
    } else {
      throw new Error("Not found.");
    }
  } else {
    throw new Error("Not found.");
  }
}

interface ISetChannelTopicArgs {
  channelId: string,
  topic: string
}

async function setChannelTopic(root: undefined, args: ISetChannelTopicArgs, context: Context): Promise<IChannel> {
  const channel = await Channels.findOne({_id: args.channelId});
  if(channel != undefined) {
    if(await permissions.checkFullWritePermission(context.user.id, channel.planet)) {
      return Channels.findOneAndUpdate({_id: args.channelId}, {$set: {name: args.topic}}, {new: true});
    } else {
      throw new Error("Not found.");
    }
  } else {
    throw new Error("Not found.");
  }
}

interface IDeleteChannelArgs {
  channelId: string
}

async function deleteChannel(root: undefined, args: IDeleteChannelArgs, context: Context): Promise<boolean> {
  const channel = await Channels.findOne({_id: args.channelId});
  if(channel != undefined) {
    if(await permissions.checkFullWritePermission(context.user.id, channel.planet)) {
      await Channels.deleteOne({_id: args.channelId});
      return true;
    } else {
      throw new Error("Not found.");
    }
  } else {
    throw new Error("Not found.");
  }
}

export default {fieldResolvers, deleteChannel, setChannelTopic, renameChannel, createChannel, channel};