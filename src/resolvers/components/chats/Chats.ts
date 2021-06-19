import Channels, { IChannel } from "../../../database/components/chat/Channels";
import Chats, { IChat } from "../../../database/components/chat/Chats";
import { IPlanet } from "../../../database/Planets";
import { IUser } from "../../../database/Users";
import Context from "../../../util/Context";
import permissions from "../../../util/permissions";

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

interface IChatArgs {
  id: string
}

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