import { Users } from "./database/Users";

async function checkAdminPermission(userId) {
  let user = null;

  user = await Users.findOne({_id: userId})

  if(user && user.admin) {
    return true;
  }
  return false;
}

export {checkAdminPermission}