import Notifications, { INotification } from "../database/Notifications";
import PubSubContainer from "./PubSubContainer";

export default async function createNotification(text: string, icon: string, userId: string): Promise<INotification> {
  const notification = new Notifications({
    user: userId,
    createdAt: Date.now(),
    icon,
    text
  });
  await notification.save();
  await PubSubContainer.pubSub.publish("NOTIFICATION_RECIEVED", {
    notificationRecieved: notification
  });
  return notification;
}