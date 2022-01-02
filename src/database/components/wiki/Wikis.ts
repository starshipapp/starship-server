import {model, Schema} from "mongoose";
import nanoIdPlugin from "mongoose-nanoid";
import { IComponent } from "../IComponent";

export interface IWiki extends IComponent {
  /** The wiki's ID. */
  _id: string,
  /** The creation date of the wiki. */
  createdAt: Date,
  /** The ID of the user who created the wiki. */
  owner: string,
  /** The date of the last edit of the wiki. */
  updatedAt: Date,
  /** The ID of the planet the wiki belongs to. */
  planet: string
}

const wikiSchema: Schema = new Schema({
  _id: String,
  owner: String,
  updatedAt: Date,
  planet: String,
  createdAt: Date,
});

wikiSchema.plugin(nanoIdPlugin, 16);

export default model<IWiki>('wikis', wikiSchema);