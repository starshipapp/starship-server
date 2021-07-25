import { IPlanet } from "../database/Planets";
import Users, { IUser } from "../database/Users";
import createNotification from "./createNotification";
import MentionSettings from "./MentionSettings";

/**
 * Gets all the users mentioned in a given text and sends a notification to them.
 * 
 * @param text The text to get the mentions from.
 * @param itemUser The user who sent the message.
 * @param itemDescriptor The descriptor of the item, to be used in the notification.
 * @param planet The planet where the message was sent.
 * 
 * @returns A promise that resolves to an array of user ids.
 */
async function getMentions(text: string, itemUser: IUser, itemDescriptor: string, planet?: IPlanet): Promise<string[]> {
  const matches = /(?:@)\b[-.\w]+\b/gu.exec(text);
  const originalUsers: string[] = [];

  matches.map((value) => originalUsers.push(value.replace("@", "")));

  const usersRetrieved = await Users.find({username: {$in: originalUsers}});
  const users: string[] = [];

  for(const user of usersRetrieved) {
    const isFollowing = planet && user.following.includes(planet._id);
    const isMember = planet && (planet.members.includes(user._id) || planet.owner == user._id);
    const isDM = itemUser && !planet;

    users.push(user._id);
    
    if(user.notificationSetting == MentionSettings.allMentions ||
       user.notificationSetting == MentionSettings.following && (isFollowing || isMember || isDM) ||
       user.notificationSetting == MentionSettings.membersOnly && (isMember || isDM) ||
       user.notificationSetting == MentionSettings.messagesOnly && isDM
      ) {
        if(user.blocked && !user.blocked.includes(itemUser._id)) {
          void createNotification(`${itemUser.username} mentioned you in ${itemDescriptor}.`, "comment", user._id);
        }
      }
  }

  return users;
}

export default getMentions;