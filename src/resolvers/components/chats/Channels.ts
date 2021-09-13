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

/**
 * Arguments for {@link fieldResolvers.messages}.
 */
interface IMessageResolverArgs {
  /* The amount of messages to retrieve. */
  limit?: number,
  /* The time used to determine what messages will be retrieved. All messages must be older than the given time. */
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
  /**
   * Gets a range of messages in a channel.
   * 
   * @param root Unused.
   * @param args The arguments to be used to get the messages. See {@link IMessageResolverArgs}.
   * 
   * @returns A promise that resolves to a message feed.
   */
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
  /**
   * Gets a range of pinned messages in a channel.
   * 
   * @param root Unused.
   * @param args The arguments to be used to get the messages. See {@link IMessageResolverArgs}.
   * 
   * @returns A promise that resolves to a message feed.
   */
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

/**
 * Arguments for {@link channel}.
 */
interface IChannelArgs {
  /* The ID of the channel to retreive. */
  id: string
}

/**
 * Gets a channel.
 * 
 * @param root Unused.
 * @param args The arguments to be used to get the channel. See {@link IChannelArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the channel.
 * 
 * @throws Throws an error if the channel could not be found.
 * @throws Throws an error if the user does not have read permission on the planet and the channel is not a direct message channel.
 * @throws Throws an error if the user is not a member of the channel and the channel is a direct message channel.
 * @throws Throws an error if the user is not logged in and the channel is a direct message channel.
 */
async function channel(root: undefined, args: IChannelArgs, context: Context): Promise<IChannel> {
  const channel = await Channels.findOne({_id: args.id});
  if(channel != undefined) {
    if(await permissions.checkReadPermission(context.user?.id ?? null, channel.planet)) {
      return channel;
    } else {
      if(!context.user || channel.type != ChannelTypes.directMessage) {
        throw new Error("Not found.");
      } else {
        if(context.user.id == channel.owner || channel.users.includes(context.user.id)) {
          return channel;
        } else {
          throw new Error("Not found.");
        }
      }
    }
  } else {
    throw new Error("Not found.");
  }
}

/**
 * Arguments for {@link createChannel}.
 */
interface ICreateChannelArgs {
  /* The ID of the chat to create the channel in. */
  chatId: string,
  /* The name of the channel. */
  name: string
}

/**
 * Creates a channel.
 * 
 * @param root Unused.
 * @param args The arguments to be used to create the channel. See {@link ICreateChannelArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the channel.
 * 
 * @throws Throws an error if the component could not be found.
 * @throws Throws an error if the user does not have full write permission on the planet.
 */
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

/**
 * Arguments for {@link renameChannel}.
 */
interface IRenameChannelArgs {
  /* The ID of the channel to rename. */
  channelId: string,
  /* The new name of the channel. */
  name: string
}

/**
 * Renames a channel.
 * 
 * @param root Unused.
 * @param args The arguments to be used to rename the channel. See {@link IRenameChannelArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the channel.
 * 
 * @throws Throws an error if the channel could not be found.
 * @throws Throws an error if the user does not have full write permission on the planet.
 * @throws Throws an error if the channel is a direct message channel.
 */
async function renameChannel(root: undefined, args: IRenameChannelArgs, context: Context): Promise<IChannel> {
  const channel = await Channels.findOne({_id: args.channelId});
  if(channel != undefined && channel.type != ChannelTypes.directMessage) {
    if(await permissions.checkFullWritePermission(context.user.id, channel.planet)) {
      return Channels.findOneAndUpdate({_id: args.channelId}, {$set: {name: args.name}}, {new: true});
    } else {
      throw new Error("Not found.");
    }
  } else {
    throw new Error("Not found.");
  }
}

/**
 * Arguments for {@link setChannelTopic}.
 */
interface ISetChannelTopicArgs {
  /* The ID of the channel to set the topic for. */
  channelId: string,
  /* The topic to set for the channel. */
  topic: string
}

/**
 * Sets the topic for a channel.
 * 
 * @param root Unused.
 * @param args The arguments to be used to set the topic for the channel. See {@link ISetChannelTopicArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the channel.
 * 
 * @throws Throws an error if the channel could not be found.
 * @throws Throws an error if the user does not have full write permission on the planet.
 * @throws Throws an error if the channel is a direct message channel.
 */
async function setChannelTopic(root: undefined, args: ISetChannelTopicArgs, context: Context): Promise<IChannel> {
  const channel = await Channels.findOne({_id: args.channelId});
  if(channel != undefined && channel.type != ChannelTypes.directMessage) {
    if(await permissions.checkFullWritePermission(context.user.id, channel.planet)) {
      return Channels.findOneAndUpdate({_id: args.channelId}, {$set: {topic: args.topic}}, {new: true});
    } else {
      throw new Error("Not found.");
    }
  } else {
    throw new Error("Not found.");
  }
}

/**
 * Arguments for {@link deleteChannel}.
 */
interface IDeleteChannelArgs {
  /* The ID of the channel to delete. */
  channelId: string
}

/**
 * Deletes a channel.
 * 
 * @param root Unused.
 * @param args The arguments to be used to delete the channel. See {@link IDeleteChannelArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to to true if the channel was deleted.
 * 
 * @throws Throws an error if the channel could not be found.
 * @throws Throws an error if the user does not have full write permission on the planet.
 * @throws Throws an error if the channel is a direct message channel.
 * 
 * @todo Throw an error if the channel is the last channel in the chat.
 */
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