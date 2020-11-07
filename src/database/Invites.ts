import {model, Schema, Document} from "mongoose";
import nanoIdPlugin from "@william341/mongoose-nanoid";

export interface IInvite extends Document {
  _id: string,
  planet: string,
  owner: string,
  createdAt: Date
}

const inviteSchema: Schema = new Schema({
  _id: String,
  planet: String,
  owner: String,
  createdAt: Date,
});

inviteSchema.plugin(nanoIdPlugin);

export default model<IInvite>('invites', inviteSchema);