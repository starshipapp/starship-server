import {model, Schema, Document} from "mongoose";
// import idPlugin from "./idPlugin";
import nanoIdPlugin from "mongoose-nanoid";

/**
 * Object used to filter the user document when sent to a client.
 */
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
  /** The user's ID. */
  _id: string,
  /** The associated login services. Only includes password logins currently. */
  services: {password: {bcrypt?: string, resetToken?: string, resetExpiry?: Date}},
  /** The user's username. */
  username: string,
  /** The registration date of the user. */
  createdAt: Date,
  /** The user's profile picture. */
  profilePicture: string,
  /** The user's email information. There is currently no way to change this. */
  emails: [{address: string, verified: boolean, verificationToken?: string}],
  /** An array of IDs representing the followed planets. */
  following: [string],
  /** Whether the user is banned. */
  banned: boolean,
  /** Whether the user is an admin. */
  admin: boolean,
  /** How many bytes the user has uploaded. */
  usedBytes: number,
  /** Whether or not the upload cap is waived. */
  capWaived: boolean,
  /** The user's Two Factor Authentication secret. */
  tfaSecret: string,
  /** Whether or not the user has 2FA enabled. */
  tfaEnabled: boolean,
  /** The user's 2FA backup codes. */
  backupCodes: [number],
  /** The user's profile banner. */
  profileBanner: string,
  /** The user's profile bio. */
  profileBio: string,
  /** An array of UUIDs representing the servers the user is currently connected to. */
  sessions: [string],
  /** An array of IDs representing the users the user has blocked. */
  blocked: [string],
  /** The user's current notification settings. */
  notificationSetting: number,
  /** Whether or not the user has geofenced tokens enabled. */
  tokenGeofencingEnabled: boolean,
  /** Whether or not the user's token should expire after 90 days. */
  tokenExpiryEnabled: boolean,
  /** Whether or not the user's token should be locked to a specific IP address */
  tokenLockEnabled: boolean
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
  blocked: {type: [String], default: []},
  notificationSetting: {type: Number, default: 1},
  tokenGeofencingEnabled: Boolean,
  tokenExpiryEnabled: Boolean,
  tokenLockEnabled: Boolean
});

userSchema.plugin(nanoIdPlugin, 16);

// userSchema.plugin(customId, {mongoose});

// eslint-disable-next-line @typescript-eslint/no-unsafe-call
export default model<IUser>('users', userSchema);
