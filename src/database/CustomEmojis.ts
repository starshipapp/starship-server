import {model, Schema, Document} from "mongoose";
import nanoIdPlugin from "mongoose-nanoid";

export interface ICustomEmoji extends Document {
  /** The emoji's ID. */
  _id: string,
  /** The ID of the owner of the emoji. */
  owner: string,
  /** The planet the emoji is from, if it is a planet emoji. */
  planet: string,
  /** The user the emoji is from, if it is a user emoji. */
  user: string,
  /** The name of the emoji. */
  name: string,
  /** The URL of the emoji. */
  url: string
}

const customEmojiSchema: Schema = new Schema({
  _id: String,
  owner: String,
  planet: String,
  user: String,
  name: String,
  url: String
});

customEmojiSchema.plugin(nanoIdPlugin, 16);

export default model<ICustomEmoji>('customemojis', customEmojiSchema);