import Planets from "../database/Planets";
import Users, { IUser } from "../database/Users";

async function checkReadPermission(userId: string, planetId: string): Promise<boolean> {
  if (userId && planetId) {
    const user = await Users.findOne({_id: userId});

    if(user == undefined) {
      throw new Error("missing-user");
    }


    if(user && user.admin) {
      return true;
    }

    const planet = await Planets.findOne({_id: planetId});

    if(planet == undefined) {
      throw new Error("missing-planet");
    }

    if(!planet.private) {
      return true;
    }

    if(planet.members && planet.members.includes(userId)) {
      return true;
    }

    if(planet.owner == userId) {
      return true;
    }

    return false;
  } else {
    throw new Error("missing-id");
  }
}

async function checkPublicWritePermission(userId: string, planetId: string): Promise<boolean> {
  if (userId && planetId) {
    const user = await Users.findOne({_id: userId});

    if(user == undefined) {
      throw new Error("missing-user");
    }

    if(user && user.banned) {
      return false;
    }

    if(user && user.admin) {
      return true;
    }

    const planet = await Planets.findOne({_id: planetId});

    if(planet == undefined) {
      throw new Error("missing-planet");
    }

    if(planet.banned && planet.banned.includes(userId)) {
      return false;
    }

    if(!planet.private) {
      return true;
    }

    if(planet.members && planet.members.includes(userId)) {
      return true;
    }

    if(planet.owner == userId) {
      return true;
    }

    return false;
  } else {
    throw new Error("missing-id");
  }
}

async function checkFullWritePermission(userId: string, planetId: string): Promise<boolean> {
  if (userId && planetId) {
    const user = await Users.findOne({_id: planetId});

    if(user == undefined) {
      throw new Error("missing-user");
    }

    if(user && user.banned) {
      return false;
    }

    if(user && user.admin) {
      return true;
    }

    const planet = await Planets.findOne({_id: planetId});

    if(planet == undefined) {
      throw new Error("missing-planet");
    }

    if(planet.banned && planet.banned.includes(userId)) {
      return false;
    }

    if(planet.members && planet.members.includes(userId)) {
      return true;
    }

    if(planet.owner == userId) {
      return true;
    }

    return false;
  } else {
    throw new Error("missing-id");
  }
}

async function checkAdminPermission(userId: string): Promise<boolean> {
  let user: IUser = null;

  user = await Users.findOne({_id: userId});

  if(user == undefined) {
    throw new Error("missing-user");
  }

  if(user && user.admin) {
    return true;
  }
  return false;
}

export default {checkAdminPermission, checkReadPermission, checkPublicWritePermission, checkFullWritePermission};