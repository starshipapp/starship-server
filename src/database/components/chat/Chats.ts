import { Document, model, Schema } from "mongoose";
import nanoIdPlugin from "mongoose-nanoid";

export interface IChat extends Document {
  _id: string,
  createdAt: Date,
  owner: string,
  planet: string
}

const chatSchema: Schema = new Schema({
  _id: String,
  createdAt: Date,
  owner: String,
  planet: String,
});

chatSchema.plugin(nanoIdPlugin, 16);

export default model<IChat>('chats', chatSchema);