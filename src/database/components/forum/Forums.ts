import {model, Schema} from "mongoose";
import nanoIdPlugin from "mongoose-nanoid";
import { IComponent } from "../IComponent";

export interface IForum extends IComponent {
  _id: string,
  createdAt: Date,
  owner: string,
  updatedAt: Date,
  planet: string,
  tags: string[]
}

const forumSchema: Schema = new Schema({
  _id: String,
  owner: String,
  updatedAt: Date,
  planet: String,
  createdAt: Date,
  tags: [String]
});

forumSchema.plugin(nanoIdPlugin, 16);

export default model<IForum>('forums', forumSchema);