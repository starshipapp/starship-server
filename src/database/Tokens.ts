import { Document, model, Schema } from "mongoose";
import nanoidPlugin from "mongoose-nanoid";

export interface IToken extends Document {
  _id: string,
  createdAt: Date,
  owner: string,
  latitude: number,
  longitude: number, 
  browser: string,
  operatingSystem: string
}

const tokenSchema: Schema = new Schema({
  _id: { type: String, required: true, unique: true},
  createdAt: String,
  owner: String,
  latitude: Number,
  longitude: Number,
  browser: String,
  operatingSystem: String
})

tokenSchema.plugin(nanoidPlugin, 16)

export default model<IToken>('tokens', tokenSchema);
