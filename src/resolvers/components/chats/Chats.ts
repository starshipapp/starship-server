import Channels, { IChannel } from "../../../database/components/chat/Channels";
import Chats, { IChat } from "../../../database/components/chat/Chats";
import { IPlanet } from "../../../database/Planets";
import { IUser } from "../../../database/Users";
import Context from "../../../util/Context";
import permissions from "../../../util/permissions";

/**
 * Resolvers for the fields of the GraphQL type.
 */
const fieldResolvers = {
  owner: async (root: IChat, args: undefined, context: Context): Promise<IUser> => {
    return context.loaders.userLoader.load(root.owner);
  },
  planet: async (root: IChat, args: undefined, context: Context): Promise<IPlanet> => {
    return context.loaders.planetLoader.load(root.planet);
  },
  channels: async (root: IChat): Promise<IChannel[]> => {
    return Channels.find({componentId: root._id});
  },
  // TODO: implement unread support
  unread: () => false,
  mentioned: () => false
};

/**
 * Arguments for {@link chat}.
 */
interface IChatArgs {
  /* The ID of the chat component to retreive. */
  id: string
}

/**
 * Gets a chat component.
 * 
 * @param root Unused.
 * @param args The arguments to be used to get the chat component. See {@link IChatArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the chat component.
 * 
 * @throws Throws an error if the component could not be found.
 * @throws Throws an error if the user does not have read permission on the planet.
 */
async function chat(root: undefined, args: IChatArgs, context: Context): Promise<IChat> {
  const chat = await Chats.findOne({_id: args.id});
  if(chat != undefined) {
    if(await permissions.checkReadPermission(context.user?.id ?? null, chat.planet)) {
      return chat;
    } else {
      throw new Error("Not found.");
    }
  } else {
    throw new Error("Not found.");
  }
}

export default {fieldResolvers, chat};