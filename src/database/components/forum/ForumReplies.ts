import {model, Schema, Document} from "mongoose";
import nanoIdPlugin from "mongoose-nanoid";

export interface IForumReply extends Document {
  _id: string,
  postId: string,
  componentId: string,
  content: string,
  owner: string,
  planet: string,
  reactions: [{emoji: string, reactors: string[]}],
  stickied: boolean,
  createdAt: Date,
  updatedAt: Date,
  mentions: [string]
}

const forumRepliesSchema: Schema = new Schema({
  _id: String,
  postId: String,
  componentId: String,
  content: String,
  owner: String,
  planet: String,
  reactions: [{emoji: String, reactors: [String]}],
  stickied: Boolean,
  createdAt: Date,
  updatedAt: Date,
  mentions: {type: [String], default: []}
});

forumRepliesSchema.plugin(nanoIdPlugin, 16);

export default model<IForumReply>('forumreplies', forumRepliesSchema);