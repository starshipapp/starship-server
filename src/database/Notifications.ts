import {model, Schema, Document} from "mongoose";
import nanoIdPlugin from "mongoose-nanoid";

export interface INotification extends Document {
  _id: string,
  user: string,
  createdAt: Date,
  icon: string,
  text: string,
  isRead: boolean
}

const notificationSchema: Schema = new Schema({
  _id: String,
  user: String,
  createdAt: {type: Date, expires: 15780000, default: Date.now()},
  icon: String,
  text: String,
  isRead: {type: Boolean, default: false}
});

notificationSchema.plugin(nanoIdPlugin, 16);

export default model<INotification>('notifications', notificationSchema);