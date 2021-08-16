import {model, Schema, Document} from "mongoose";
import nanoIdPlugin from "mongoose-nanoid";

export interface IInvite extends Document {
  /** The invite's ID. */
  _id: string,
  /** The ID of the target planet. */
  planet: string,
  /** The ID of the user who created the invite. */
  owner: string,
  /** The creation date of the invite. */
  createdAt: Date
}

const inviteSchema: Schema = new Schema({
  _id: String,
  planet: String,
  owner: String,
  createdAt: Date,
});

inviteSchema.plugin(nanoIdPlugin, 16);

export default model<IInvite>('invites', inviteSchema);