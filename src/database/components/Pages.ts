import {model, Schema} from "mongoose";
import nanoIdPlugin from "mongoose-nanoid";
import { IComponent } from "./IComponent";

export interface IPage extends IComponent {
  _id: string,
  createdAt: Date,
  owner: string,
  updatedAt: Date,
  planet: string,
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

pageSchema.plugin(nanoIdPlugin);

export default model<IPage>('pages', pageSchema);