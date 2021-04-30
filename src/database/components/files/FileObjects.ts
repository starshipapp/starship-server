import {model, Schema, Document} from "mongoose";
import nanoIdPlugin from "mongoose-nanoid";

export interface IFileObject extends Document {
  _id: string,
  path: [string],
  parent: string,
  name: string,
  planet: string,
  owner: string,
  createdAt: Date,
  componentId: string,
  type: string,
  fileType: string,
  key: string,
  finishedUploading: boolean,
  shareId: string,
  size: number
}

const fileObjectsSchema: Schema = new Schema({
  _id: String,
  path: [String],
  parent: String,
  name: String,
  planet: String,
  owner: String,
  createdAt: Date,
  componentId: String,
  type: String,
  fileType: String,
  key: String,
  finishedUploading: Boolean,
  shareId: String,
  size: Number
});

fileObjectsSchema.plugin(nanoIdPlugin, 16);

export default model<IFileObject>('fileobjects', fileObjectsSchema);