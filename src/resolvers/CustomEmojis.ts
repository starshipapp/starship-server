import e from "express";
import CustomEmojis, { ICustomEmoji } from "../database/CustomEmojis";
import Context from "../util/Context";
import permissions from "../util/permissions";

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

export default {customEmoji};