import {model, Schema, Document} from "mongoose";
import nanoIdPlugin from "mongoose-nanoid";

export interface INotification extends Document {
  /** The notification's ID. */
  _id: string,
  /** The ID of the recipient. */
  user: string,
  /** The creation date of the notification. */
  createdAt: Date,
  /** The notification's icon. */
  icon: string,
  /** The content of the notification. */
  text: string,
  /** Whether or not the notification is read. */
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