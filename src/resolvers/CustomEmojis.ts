import CustomEmojis, { ICustomEmoji } from "../database/CustomEmojis";
import { IPlanet } from "../database/Planets";
import { IUser } from "../database/Users";
import Context from "../util/Context";
import permissions from "../util/permissions";

/**
 * Resolvers for the fields of the GraphQL type.
 */
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

/**
 * Arguments for {@link customEmoji}.
 */
interface ICustomEmojiArgs {
  /** The ID of the custom emoji. */
  id: string
}

/**
 * Gets a single custom emoji.
 * 
 * @param root Unused.
 * @param args The arguments to be used to get the custom emoji. See {@link ICustomEmojiArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the custom emoji.
 * 
 * @throws Throws an error if the custom emoji could not be found.
 * @throws Throws an error if the user does not have permission to read the planet that the emoji is on.
 */
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

/**
 * The arguments for {@link deleteCustomEmoji}.
 */
interface IDeleteCustomEmojiArgs {
  /** The ID of the custom emoji. */
  emojiId: string
}

/**
 * Deletes a custom emoji.
 * 
 * @param root Unused.
 * @param args The arguments to be used to delete the custom emoji. See {@link IDeleteCustomEmojiArgs}.
 * @param context The current user context for the request.
 *
 * @returns A promise that resolves to true if the custom emoji was deleted.
 * 
 * @throws Throws an error if the user does not have permission to delete the custom emoji.
 * @throws Throws an error if the custom emoji could not be found.
 */
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