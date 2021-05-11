import {model, Schema, Document} from "mongoose";
import nanoIdPlugin from "mongoose-nanoid";

export interface INotification extends Document {
  _id: string,
  user: string,
  createdAt: Date,
  icon: string,
  text: string
}

const notificationSchema: Schema = new Schema({
  _id: String,
  user: String,
  createdAt: Date,
  icon: String,
  text: String
});

notificationSchema.plugin(nanoIdPlugin, 16);

export default model<INotification>('notifications', notificationSchema);