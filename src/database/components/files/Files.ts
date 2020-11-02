import mongoose, {model, Schema, Document} from "mongoose";
import customId from "mongoose-hook-custom-id";
import nanoIdPlugin from "mongoose-nanoid";

export interface IFiles extends Document {
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