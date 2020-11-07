import {model, Schema, Document} from "mongoose";
import nanoIdPlugin from "mongoose-nanoid";

export interface IPage extends Document {
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