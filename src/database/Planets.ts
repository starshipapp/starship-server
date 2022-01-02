import {model, Schema, Document} from "mongoose";
import nanoIdPlugin from "mongoose-nanoid";

export interface IPlanet extends Document {
  /** The planet's ID. */
  _id: string,
  /** The planet's name. */
  name: string,
  /** The creation date of the planet. */
  createdAt: Date,
  /** The ID of the owner of the planet. */
  owner: string,
  /** Whether or not the planet is private. */
  private: boolean,
  /** The amount of followers the planet has. */
  followerCount: number,
  /** The components of the planet. */
  components: [{name: string, componentId: string, type: string}],
  /** The planet's home component. */
  homeComponent: {componentId: string, type: string},
  /** Whether or not the planet is featured. */
  featured: boolean,
  /** Whether or not the planet is verified. */
  verified: boolean,
  /** Whether or not the planet is partnered. */
  partnered: boolean,
  /** The description of the planet used on the Featured Planets page. */
  featuredDescription: string,
  /** An array of the IDs of the users banned from the planet. */
  banned: [string],
  /** An array of the IDs of the users who are members of the planet. */
  members: [string],
  /** The planet's custom CSS. */
  css: string,
  /** The planet's description. */
  description: string
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
  members: [String],
  css: String,
  description: String,
  lastRead: [{channelId: String, date: Date}]
});

planetSchema.plugin(nanoIdPlugin, 16);

export default model<IPlanet>('planets', planetSchema);