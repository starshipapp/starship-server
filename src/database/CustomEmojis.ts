import {model, Schema, Document} from "mongoose";
import nanoIdPlugin from "mongoose-nanoid";

export interface ICustomEmoji extends Document {
  _id: string,
  owner: string,
  planet: string,
  user: string,
  name: string,
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