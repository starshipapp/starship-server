import Notifications, { INotification } from "../database/Notifications";
import PubSubContainer from "./PubSubContainer";

/**
 * Sends a notification to the user.
 * 
 * @param text The message to send.
 * @param icon The icon to use.
 * @param userId The user to send the message to.
 * 
 * @returns A promise that resolves to the notification sent.
 */
export default async function createNotification(text: string, icon: string, userId: string): Promise<INotification> {
  const notification = new Notifications({
    user: userId,
    createdAt: Date.now(),
    icon,
    text
  });
  await notification.save();
  await PubSubContainer.pubSub.publish("NOTIFICATION_RECIEVED", {
    notificationRecieved: notification.toObject()
  });
  return notification;
}
