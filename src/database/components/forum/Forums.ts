import mongoose, {model, Schema, Document} from "mongoose";
import customId from "mongoose-hook-custom-id";
import nanoIdPlugin from "mongoose-nanoid";

export interface IForum extends Document {
  _id: string,
  createdAt: Date,
  owner: string,
  updatedAt: Date,
  planet: string
}

const forumSchema: Schema = new Schema({
  _id: String,
  owner: String,
  updatedAt: Date,
  planet: String,
  createdAt: Date,
});

forumSchema.plugin(nanoIdPlugin);

export default model<IForum>('forums', forumSchema);