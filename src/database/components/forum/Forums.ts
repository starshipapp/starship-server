import {model, Schema} from "mongoose";
import nanoIdPlugin from "mongoose-nanoid";
import { IComponent } from "../IComponent";

export interface IForum extends IComponent {
  /** The forum's ID. */
  _id: string,
  /** The creation date of the forum. */
  createdAt: Date,
  /** The ID of the user who created the forum. */
  owner: string,
  /** Unused. */
  updatedAt: Date,
  /** The ID of the planet this forum belongs to. */
  planet: string,
  /** The fourm's available tags. */
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