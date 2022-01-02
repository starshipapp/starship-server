import { IUser } from "../database/Users";

/**
 * Checks if the user can upload a file.
 *
 * @param user The user to check.
 * 
 * @returns True if the user can upload a file, false otherwise.
 */
function canUpload(user: IUser): boolean {
  if(user.capWaived) {
    return true;
  }
  if(user.usedBytes > 26843531856) {
    return false;
  }
  return true;
}

export default canUpload;