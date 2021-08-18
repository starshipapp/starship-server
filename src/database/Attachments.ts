import { Document, model, Schema } from "mongoose";
import nanoIdPlugin from "mongoose-nanoid";

export interface IAttachment extends Document {
  /** The attachment's ID. */
  _id: string,
  /** The attachment's filename. */ 
  name: string,
  /** The attachment's content type. */
  type: string,
  /** The attachment's URL. */
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