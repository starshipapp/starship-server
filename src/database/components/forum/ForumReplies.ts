import {model, Schema, Document} from "mongoose";
import nanoIdPlugin from "mongoose-nanoid";

export interface IForumReply extends Document {
  /** The reply's ID. */
  _id: string,
  /** The ID of the post that this reply is a reply to. */
  postId: string,
  /** The ID of the forum this reply is in. */
  componentId: string,
  /** The content of the reply. */
  content: string,
  /** The ID of the user that created the reply. */
  owner: string,
  /** The ID of the planet that the reply is in. */
  planet: string,
  /** The reactions to this reply. */
  reactions: [{emoji: string, reactors: string[]}],
  /** Whether or not this reply is stickied. This field is currently unused. */
  stickied: boolean,
  /** The date the reply was created. */
  createdAt: Date,
  /** The date the reply was last modified. */
  updatedAt: Date,
  /** The IDs of the mentioned users. */
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