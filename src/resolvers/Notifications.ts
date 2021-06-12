import { withFilter } from "apollo-server-express";
import Context from "../util/Context";
import Notifications, { INotification } from "../database/Notifications";
import { IUser } from "../database/Users";
import PubSubContainer from "../util/PubSubContainer";

const fieldResolvers = {
  user: async (root: INotification, args: undefined, context: Context): Promise<IUser> => {
    return context.loaders.userLoader.load(root.user);
  },
};

const notificationRecieved = {
  subscribe: withFilter(() => PubSubContainer.pubSub.asyncIterator<{notificationRecieved: INotification}>(['NOTIFICATION_RECIEVED']), (payload: {notificationRecieved: INotification}, variables, context: Context) => {
    if(context.user) {
      return payload.notificationRecieved.user && payload.notificationRecieved.user == context.user.id;
    }
    return false;
  })
};

async function notifications(root: undefined, args: undefined, context: Context): Promise<INotification[]> {
  if(context.user) {
    return await Notifications.find({user: context.user.id}).sort({createdAt: -1});
  } else {
    throw new Error("Not logged in.");
  }
}

interface INotificationArgs {
  id: string
}

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

interface IClearNotificationArgs {
  notificationId: string
}

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

async function clearAllNotifications(root: undefined, args: undefined, context: Context): Promise<boolean> {
  if(context.user) {
    await Notifications.deleteMany({user: context.user.id});
    return true;
  } else {
    throw new Error("Not logged in.");
  }
}

async function markAllRead(root: undefined, args: undefined, context: Context): Promise<boolean> {
  if(context.user) {
    await Notifications.updateMany({user: context.user.id, isRead: false}, {$set: {isRead: true}});
    return true;
  } else {
    throw new Error("Not logged in.");
  }
}

export default {fieldResolvers, notificationRecieved, markAllRead, notifications, notification, clearNotification, clearAllNotifications};