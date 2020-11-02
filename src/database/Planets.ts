import mongoose, {model, Schema, Document} from "mongoose";
import customId from "mongoose-hook-custom-id";
import nanoIdPlugin from "mongoose-nanoid";

export interface IPlanet extends Document {
  _id: string,
  name: string,
  createdAt: Date,
  owner: string,
  private: boolean,
  followerCount: number,
  components: [{names: string, componentId: string, type: string}],
  homeComponent: {names: string, componentId: string, type: string},
  featured: boolean,
  verified: boolean,
  partnered: boolean,
  featuredDescription: string,
  banned: [string],
  members: [string]
}

const planetSchema: Schema = new Schema({
  _id: String,
  name: String,
  createdAt: Date,
  owner: String,
  private: Boolean,
  followerCount: Number,
  components: [{name: String, componentId: String, type: String}],
  homeComponent: {name: String, componentId: String, type: String},
  featured: Boolean,
  verified: Boolean,
  partnered: Boolean,
  featuredDescription: String,
  banned: [String],
  members: [String]
});

planetSchema.plugin(nanoIdPlugin);

export default model<IPlanet>('planets', planetSchema);