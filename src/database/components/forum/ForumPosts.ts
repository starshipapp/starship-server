import {model, Schema, Document} from "mongoose";
import nanoIdPlugin from "@william341/mongoose-nanoid";

export interface IForumPost extends Document {
  _id: string,
  name: string,
  componentId: string,
  content: string,
  owner: string,
  planet: string,
  tags: [string],
  reactions: [{emoji: string, reactors: string[]}],
  replyCount: number,
  stickied: boolean,
  createdAt: Date,
  updatedAt: Date,
  locked: boolean,
}

const forumPostSchema: Schema = new Schema({
  _id: String,
  name: String,
  componentId: String,
  content: String,
  owner: String,
  planet: String,
  tags: [String],
  reactions: [{emoji: String, reactors: [String]}],
  replyCount: Number,
  stickied: Boolean,
  locked: Boolean,
  createdAt: Date,
  updatedAt: Date
});

forumPostSchema.plugin(nanoIdPlugin);

export default model<IForumPost>('forumposts', forumPostSchema);