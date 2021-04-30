import { IUser } from "../database/Users";

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