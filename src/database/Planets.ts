import {model, Schema, Document} from "mongoose";
import nanoIdPlugin from "@william341/mongoose-nanoid";

export interface IPlanet extends Document {
  _id: string,
  name: string,
  createdAt: Date,
  owner: string,
  private: boolean,
  followerCount: number,
  components: [{name: string, componentId: string, type: string}],
  homeComponent: {componentId: string, type: string},
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
  components: [Object],
  homeComponent: Object,
  featured: Boolean,
  verified: Boolean,
  partnered: Boolean,
  featuredDescription: String,
  banned: [String],
  members: [String]
});

planetSchema.plugin(nanoIdPlugin);

export default model<IPlanet>('planets', planetSchema);