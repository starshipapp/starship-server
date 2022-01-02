import {model, Schema, Document} from "mongoose";
import nanoIdPlugin from "mongoose-nanoid";

export interface IFileObject extends Document {
  /** The object's ID. */
  _id: string,
  /** The path IDs of the object's parents. */
  path: [string],
  /** The object's direct parent. */
  parent: string,
  /** The object's name. */
  name: string,
  /** The planet the object belongs to. */
  planet: string,
  /** The ID of the object's creator. */
  owner: string,
  /** The creation date of the object. */
  createdAt: Date,
  /** The ID of the file component that this object belongs to. */
  componentId: string,
  /** The meta type of the object. Either "folder" or "file". */
  type: string,
  /** The MIME type of the object. */
  fileType: string,
  /** The object's key. */
  key: string,
  /** Whether or not the object has finished uploading. */
  finishedUploading: boolean,
  /** The object's size. */
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
  size: Number
});

fileObjectsSchema.plugin(nanoIdPlugin, 16);

export default model<IFileObject>('fileobjects', fileObjectsSchema);