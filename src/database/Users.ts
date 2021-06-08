import {model, Schema, Document} from "mongoose";
// import idPlugin from "./idPlugin";
import nanoIdPlugin from "mongoose-nanoid";

export const safeUserFields = {
  _id: true,
  username: true,
  createdAt: true,
  profilePicture: true,
  profileBanner: true,
  profileBio: true,
  banned: true,
  admin: true,
  sessions: true
};

export interface IUser extends Document {
  _id: string,
  services: {password: {bcrypt?: string, resetToken?: string, resetExpiry?: Date}},
  username: string,
  createdAt: Date,
  profilePicture: string,
  emails: [{address: string, verified: boolean, verificationToken?: string}],
  following: [string],
  banned: boolean,
  admin: boolean,
  usedBytes: number,
  capWaived: boolean,
  tfaSecret: string,
  tfaEnabled: boolean,
  backupCodes: [number],
  profileBanner: string,
  profileBio: string,
  sessions: [string],
  blocked: [string]
}

const userSchema: Schema = new Schema({
  _id: { type: String, required: true, unique: true},
  services: {password: {bcrypt: String, resetToken: String, resetExpiry: Date}},
  username: String,
  createdAt: Date,
  profilePicture: String,
  emails: [{address: String, verified: Boolean, verificationToken: String}],
  following: [String],
  banned: Boolean,
  admin: Boolean,
  usedBytes: {type: Number, default: 0},
  capWaived: Boolean,
  tfaSecret: String,
  tfaEnabled: {type: Boolean, default: false},
  backupCodes: [Number],
  profileBanner: String,
  profileBio: String,
  sessions: {type: [String], default: []},
  blocked: {type: [String], default: []}
});

userSchema.plugin(nanoIdPlugin, 16);

// userSchema.plugin(customId, {mongoose});

// eslint-disable-next-line @typescript-eslint/no-unsafe-call
export default model<IUser>('users', userSchema);