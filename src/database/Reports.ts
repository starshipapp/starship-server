import {model, Schema, Document} from "mongoose";
import nanoIdPlugin from "mongoose-nanoid";

export interface IReport extends Document {
  _id: string,
  owner: string,
  createdAt: Date,
  objectType: number,
  objectId: string,
  reportType: number,
  details: string,
  userId: string,
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