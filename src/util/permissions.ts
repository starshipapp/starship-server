import Planets, { IPlanet } from "../database/Planets";
import Users, { IUser } from "../database/Users";

async function checkReadPermission(userId: string | IUser | undefined, planetId: string | IPlanet): Promise<boolean> {
  if (planetId) {
    const planet = typeof(planetId) == "string" ? await Planets.findOne({_id: planetId}) : planetId;

    if(planet == undefined) {
      throw new Error("Not found.");
    }

    if(!planet.private) {
      return true;
    }

    if(!userId) {
      return false;
    }

    const user = typeof(userId) == "string" ? await Users.findOne({_id: userId}) : userId;

    if(user == undefined) {
      throw new Error("Not found.");
    }

    if(user && user.admin) {
      return true;
    }

    if(planet.members && planet.members.includes(user._id)) {
      return true;
    }

    if(planet.owner == userId) {
      return true;
    }

    return false;
  } else {
    throw new Error("server-missing-id");
  }
}

async function checkPublicWritePermission(userId: string | IUser, planetId: string | IPlanet): Promise<boolean> {
  if (userId && planetId) {
    const user = typeof(userId) == "string" ? await Users.findOne({_id: userId}) : userId;

    if(user == undefined) {
      throw new Error("Not found.");
    }

    if(user && user.banned) {
      return false;
    }

    if(user && user.admin) {
      return true;
    }

    const planet = typeof(planetId) == "string" ? await Planets.findOne({_id: planetId}) : planetId;

    if(planet == undefined) {
      throw new Error("Not found.");
    }

    if(planet.banned && planet.banned.includes(user._id)) {
      return false;
    }

    if(!planet.private) {
      return true;
    }

    if(planet.members && planet.members.includes(user._id)) {
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

async function checkFullWritePermission(userId: string | IUser, planetId: string | IPlanet): Promise<boolean> {
  if (userId && planetId) {
    const user = typeof(userId) == "string" ? await Users.findOne({_id: userId}) : userId;

    if(user == undefined) {
      throw new Error("Not found.");
    }

    if(user && user.banned) {
      return false;
    }

    if(user && user.admin) {
      return true;
    }

    const planet = typeof(planetId) == "string" ? await Planets.findOne({_id: planetId}) : planetId;

    if(planet == undefined) {
      throw new Error("Not found.");
    }

    if(planet.banned && planet.banned.includes(user._id)) {
      return false;
    }

    if(planet.members && planet.members.includes(user._id)) {
      return true;
    }

    if(planet.owner == userId) {
      return true;
    }

    return false;
  } else {
    throw new Error("Not found.");
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