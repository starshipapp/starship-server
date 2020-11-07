import {model, Schema} from "mongoose";
import nanoIdPlugin from "@william341/mongoose-nanoid";
import { IComponent } from "../IComponent";

export interface IForum extends IComponent {
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