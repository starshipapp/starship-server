import { withFilter } from "graphql-subscriptions";
import Context from "../util/Context";
import Notifications, { INotification } from "../database/Notifications";
import { IUser } from "../database/Users";
import PubSubContainer from "../util/PubSubContainer";

/**
 * Resolvers for the fields of the GraphQL type.
 */
const fieldResolvers = {
  user: async (root: INotification, args: undefined, context: Context): Promise<IUser> => {
    return context.loaders.userLoader.load(root.user);
  },
};

/**
 * Subscription handler for receiving new notifications.
 */
const notificationRecieved = {
  subscribe: withFilter(() => PubSubContainer.pubSub.asyncIterator<{notificationRecieved: INotification}>(['NOTIFICATION_RECIEVED']), (payload: {notificationRecieved: INotification}, variables, context: Context) => {
    if(context.user) {
      return payload.notificationRecieved.user && payload.notificationRecieved.user == context.user.id;
    }
    return false;
  }),
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  resolve: (payload: {notificationRecieved: INotification}) => {
    return {
      ...payload.notificationRecieved,
      id: payload.notificationRecieved._id
    };
  }
};

/**
 * Gets all of the current user's notifications.
 * 
 * @param root Unused.
 * @param args Unused.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the notifications.
 * 
 * @throws Throws an error if the user is not logged in.
 */
async function notifications(root: undefined, args: undefined, context: Context): Promise<INotification[]> {
  if(context.user) {
    return await Notifications.find({user: context.user.id}).sort({createdAt: -1});
  } else {
    throw new Error("Not logged in.");
  }
}

/**
 * Arguments for {@link notification}.
 */
interface INotificationArgs {
  /** The notification to retreive. */
  id: string
}

/**
 * Gets a single notification.
 * 
 * @param root Unused.
 * @param args The arguments to be used to retrieve the notification. See {@link INotificationArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the notification.
 * 
 * @throws Throws an error if the user is not logged in.
 * @throws Throws an error if the notification is not found.
 */
async function notification(root: undefined, args: INotificationArgs, context: Context): Promise<INotification> {
  if(context.user) {
    const notification = await Notifications.findOne({_id: args.id, user: context.user.id});
    if(notification) {
      return notification;
    } else {
      throw new Error("Not found.");
    }
  } else {
    throw new Error("Not logged in.");
  }
}

/**
 * Arguments for {@link clearNotification}
 */
interface IClearNotificationArgs {
  /** The notification to clear. */
  notificationId: string
}

/**
 * Clears a single notification.
 * 
 * @param root Unused.
 * @param args The arguments to be used to clear the notification. See {@link IClearNotificationArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to true if the notification was cleared.
 * 
 * @throws Throws an error if the user is not logged in.
 * @throws Throws an error if the notification is not found.
 */
async function clearNotification(root: undefined, args: IClearNotificationArgs, context: Context): Promise<boolean> {
  if(context.user) {
    const notification = await Notifications.findOneAndDelete({_id: args.notificationId, user: context.user.id});
    if(notification) {
      return true;
    } else {
      throw new Error("Not found.");
    }
  } else {
    throw new Error("Not logged in.");
  }
}

/**
 * Clears all the current user's notifications.
 * 
 * @param root Unused.
 * @param args Unused.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to true if the notifications were cleared.
 * 
 * @throws Throws an error if the user is not logged in.
 */
async function clearAllNotifications(root: undefined, args: undefined, context: Context): Promise<boolean> {
  if(context.user) {
    await Notifications.deleteMany({user: context.user.id});
    return true;
  } else {
    throw new Error("Not logged in.");
  }
}

/**
 * Marks all notifications as read.
 * 
 * @param root Unused.
 * @param args Unused.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to true if the notifications were marked as read.
 * 
 * @throws Throws an error if the user is not logged in.
 */
async function markAllRead(root: undefined, args: undefined, context: Context): Promise<boolean> {
  if(context.user) {
    await Notifications.updateMany({user: context.user.id, isRead: false}, {$set: {isRead: true}});
    return true;
  } else {
    throw new Error("Not logged in.");
  }
}
 
export default {fieldResolvers, notificationRecieved, markAllRead, notifications, notification, clearNotification, clearAllNotifications};
