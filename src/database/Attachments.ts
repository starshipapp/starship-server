import { Document, model, Schema } from "mongoose";
import nanoIdPlugin from "mongoose-nanoid";

export interface IAttachment extends Document {
  _id: string,
  name: string,
  type: string,
  url: string
}

const attachmentSchema: Schema = new Schema({
  _id: String,
  name: String,
  type: String,
  url: String,
});

attachmentSchema.plugin(nanoIdPlugin, 16);

export default model<IAttachment>('attachments', attachmentSchema);