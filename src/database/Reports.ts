import {model, Schema, Document} from "mongoose";
import nanoIdPlugin from "mongoose-nanoid";

export interface IReport extends Document {
  /** The report's ID. */
  _id: string,
  /** The ID of the owner of the report. */
  owner: string,
  /** The creation date of the report. */
  createdAt: Date,
  /** The type of object being reported. */
  objectType: number,
  /** The ID of the object being reported. */
  objectId: string,
  /** The type of the report. */
  reportType: number,
  /** The report's message. */
  details: string,
  /** The ID of the user being reported. */
  userId: string,
  /** Whether the report is resolved. */
  solved: boolean
}

const reportSchema: Schema = new Schema({
  _id: String,
  owner: String,
  createdAt: Date,
  objectType: Number,
  objectId: String,
  reportType: Number,
  details: String,
  userId: String,
  solved: Boolean
});

reportSchema.plugin(nanoIdPlugin, 16);

export default model<IReport>('reports', reportSchema);