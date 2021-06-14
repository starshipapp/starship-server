import { Document, model, Schema } from "mongoose";
import nanoIdPlugin from "mongoose-nanoid";

export interface IReadReceipt extends Document {
  _id: string,
  planet: string,
  user: string,
  lastRead: [{channelId: string, date: Date}]
}

const readReceiptSchema: Schema = new Schema({
  _id: String,
  user: String,
  planet: String,
  lastRead: [{channelId: String, date: Date}]
});

readReceiptSchema.plugin(nanoIdPlugin, 16);

export default model<IReadReceipt>('readreceipts', readReceiptSchema);