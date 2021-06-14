import { Document, model, Schema } from "mongoose";
import nanoIdPlugin from "mongoose-nanoid";

export interface IChannel extends Document {
  _id: string,
  name: string,
  type: number,
  topic: string,
  createdAt: Date,
  componentId: string,
  planet: string,
  owner: string,
  users: [string]
}

const channelSchema: Schema = new Schema({
  _id: String,
  name: String,
  type: Number,
  topic: String,
  createdAt: Date,
  componentId: String,
  planet: String,
  owner: String,
  users: [String]
});

channelSchema.plugin(nanoIdPlugin, 16);

export default model<IChannel>('channels', channelSchema);