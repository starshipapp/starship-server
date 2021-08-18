import {model, Schema} from "mongoose";
import nanoIdPlugin from "mongoose-nanoid";
import { IComponent } from "./IComponent";

export interface IPage extends IComponent {
  /** The page's ID. */
  _id: string,
  /** The creation date of the page. */
  createdAt: Date,
  /** The ID of the user who created the page. */
  owner: string,
  /** The last modification date of the page. */
  updatedAt: Date,
  /** The ID of the planet the page belongs to. */
  planet: string,
  /** The page's content. */
  content: string
}

const pageSchema: Schema = new Schema({
  _id: String,
  createdAt: Date,
  owner: String,
  updatedAt: Date,
  planet: String,
  content: String,
});

pageSchema.plugin(nanoIdPlugin, 16);

export default model<IPage>('pages', pageSchema);