import { Document, model, Schema } from "mongoose";
import nanoIdPlugin from "mongoose-nanoid";

export interface IMessage extends Document {
  _id: string,
  createdAt: Date,
  content: string,
  pinned: boolean,
  edited: boolean,
  channel: string,
  owner: string,
  mentions: [string],
  reactions: [{emoji: string, reactors: string[]}],
  parent: string,
  attachments: [string]
}

const messageSchema: Schema = new Schema({
  _id: String,
  createdAt: Date,
  content: String,
  pinned: Boolean,
  edited: Boolean,
  channel: String,
  owner: String,
  mentions: {type: [String], default: []},
  reactions: [{emoji: String, reactors: [String]}],
  parent: String,
  attachments: [String]
});

messageSchema.plugin(nanoIdPlugin, 16);

export default model<IMessage>('messages', messageSchema);