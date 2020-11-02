import mongoose, {model, Schema, Document} from "mongoose";
import customId from "mongoose-hook-custom-id";
// import idPlugin from "./idPlugin";
import nanoIdPlugin from "mongoose-nanoid";

export interface IUser extends Document {
  _id: string,
  services: {password: {bcrypt: string}},
  username: string,
  createdAt: Date,
  profilePicture: string,
  emails: [{address: string, verified: boolean}],
  following: [string],
  banned: boolean,
  admin: boolean,
}

const userSchema: Schema = new Schema({
  _id: { type: String, required: true, unique: true},
  services: Object,
  username: String,
  createdAt: Date,
  profilePicture: String,
  emails: [{address: String, verified: Boolean}],
  following: [String],
  banned: Boolean,
  admin: Boolean
});

userSchema.plugin(nanoIdPlugin);

// userSchema.plugin(customId, {mongoose});

// eslint-disable-next-line @typescript-eslint/no-unsafe-call
export default model<IUser>('users', userSchema);