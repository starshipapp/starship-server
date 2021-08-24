import {model, Schema, Document} from "mongoose";
import nanoIdPlugin from "mongoose-nanoid";

export interface IForumPost extends Document {
  /** The forum post's ID. */
  _id: string,
  /** The forum post's title. */
  name: string,
  /** The ID of the forum that the post belongs to. */
  componentId: string,
  /** The content of the forum post. */
  content: string,
  /** The ID of the user that created the forum post. */
  owner: string,
  /** The ID of the planet that the forum post is on. */
  planet: string,
  /** The tags associated with the forum post. */
  tags: [string],
  /** The reactions to the forum post. */
  reactions: [{emoji: string, reactors: string[]}],
  /** The amount of replies to the forum post. */
  replyCount: number,
  /** Whether or not the forum post is stickied. */
  stickied: boolean,
  /** The date the forum post was created. */
  createdAt: Date,
  /** The date the forum post was last updated. */
  updatedAt: Date,
  /** Whether or not the forum post is locked. */
  locked: boolean,
  /** The IDs of the mentioned users. */
  mentions: [string]
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
  updatedAt: Date,
  mentions: {type: [String], default: []}
});

forumPostSchema.plugin(nanoIdPlugin, 16);

export default model<IForumPost>('forumposts', forumPostSchema);