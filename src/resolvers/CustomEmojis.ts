import CustomEmojis, { ICustomEmoji } from "../database/CustomEmojis";
import { IPlanet } from "../database/Planets";
import { IUser } from "../database/Users";
import Context from "../util/Context";
import permissions from "../util/permissions";


const fieldResolvers = {
  owner: async (root: ICustomEmoji, args: undefined, context: Context): Promise<IUser> => {
    return context.loaders.userLoader.load(root.owner);
  },
  user: async (root: ICustomEmoji, args: undefined, context: Context): Promise<(IUser | null)> => {
    if(root.user) {
      return context.loaders.userLoader.load(root.user);
    }
    return null;
  },
  planet: async (root: ICustomEmoji, args: undefined, context: Context): Promise<(IPlanet | null)> => {
    if(root.planet) {
      return context.loaders.planetLoader.load(root.planet);
    }
    return null;
  }
};

interface ICustomEmojiArgs {
  id: string
}

async function customEmoji(root: undefined, args: ICustomEmojiArgs, context: Context): Promise<ICustomEmoji> {
  const emoji = await CustomEmojis.findOne({_id: args.id}); 
  if(emoji) {
    if(emoji.planet) {
      if(await permissions.checkReadPermission(context.user.id, emoji.planet)) {
        return emoji;
      } else {
        throw new Error("Not found.");
      }
    } else {
      return emoji;
    }
  } else {
    throw new Error("Not found.");
  }
}

interface IDeleteCustomEmojiArgs {
  emojiId: string
}

async function deleteCustomEmoji(root: undefined, args: IDeleteCustomEmojiArgs, context: Context): Promise<boolean> {
  const emoji = await CustomEmojis.findOne({_id: args.emojiId}); 
  if(emoji) {
    if(emoji.planet) {
      if(await permissions.checkFullWritePermission(context.user.id, emoji.planet)) {
        await CustomEmojis.deleteOne({_id: emoji._id});
        return true;
      } else {
        throw new Error("Not found.");
      }
    } else {
      if(context.user.id && emoji.user === context.user.id) {
        await CustomEmojis.deleteOne({_id: emoji._id});
        return true;
      } else {
        throw new Error("You can only delete your own emojis.");
      }
    }
  } else {
    throw new Error("Not found.");
  }
}

export default {fieldResolvers, customEmoji, deleteCustomEmoji};