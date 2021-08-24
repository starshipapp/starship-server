import {model, Schema} from "mongoose";
import nanoIdPlugin from "mongoose-nanoid";
import { IComponent } from "../IComponent";

export interface IFiles extends IComponent {
  /** The file component's ID. */
  _id: string,
  /** The creation date of the file component. */
  createdAt: Date,
  /** The ID of the user who created the file component. */
  owner: string,
  /** The last update date of the file component. */
  updatedAt: Date,
  /** The ID of the planet the file component belongs to. */
  planet: string
}

const filesSchema: Schema = new Schema({
  _id: String,
  owner: String,
  updatedAt: Date,
  planet: String,
  createdAt: Date,
});

filesSchema.plugin(nanoIdPlugin, 16);

export default model<IFiles>('files', filesSchema);