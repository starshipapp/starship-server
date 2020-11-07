import {model, Schema} from "mongoose";
import nanoIdPlugin from "@william341/mongoose-nanoid";
import { IComponent } from "../IComponent";

export interface IFiles extends IComponent {
  _id: string,
  createdAt: Date,
  owner: string,
  updatedAt: Date,
  planet: string
}

const filesSchema: Schema = new Schema({
  _id: String,
  owner: String,
  updatedAt: Date,
  planet: String,
  createdAt: Date,
});

filesSchema.plugin(nanoIdPlugin);

export default model<IFiles>('files', filesSchema);