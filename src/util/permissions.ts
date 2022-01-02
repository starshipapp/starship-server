import Planets, { IPlanet } from "../database/Planets";
import Users, { IUser } from "../database/Users";
/*
 * Permissions in Starship currently use the following permission system:
 * read: Allows a user to view the planet.
 *  - If the planet is private, the user must be a member of the planet or the planet owner.
 *  - If the planet is public, anyone can view the planet.
 * 
 * publicWrite: Allows a user to post in forums & react to, but not send chat messages.
 *  - If the planet is private, the user must be a member of the planet or the planet owner.
 *  - If the planet is public, the user must not be banned in any way.
 * 
 * fullWrite: Allows a user to edit the planet.
 *  - The user must be a member of the planet or the planet owner.
 * 
 * admin: Allows a user to do anything.
 *  - The user must be an global administrator.
 */

/**
 * Checks if the user has read permission on the foundPlanet.
 * 
 * @param user The user to check. Takes an ID string, user object or undefined.
 * @param planet The planet to check. Takes an ID string or planet object.
 * 
 * @returns A promise that resolves to true if the user has read permission, false otherwise.
 * 
 * @throws Throws an error if the planet is not found.
 * @throws Throws an error if the user is not found, and the planet is private.
 */
async function checkReadPermission(user: string | IUser | undefined, planet: string | IPlanet): Promise<boolean> {
  if (planet) {
    const foundPlanet = typeof(planet) == "string" ? await Planets.findOne({_id: planet}) : planet;

    if(foundPlanet == undefined) {
      throw new Error("Not found.");
    }

    if(!foundPlanet.private) {
      return true;
    }

    if(!user) {
      return false;
    }

    const foundUser = typeof(user) == "string" ? await Users.findOne({_id: user}) : user;

    if(foundUser == undefined) {
      throw new Error("Not found.");
    }

    if(foundUser && foundUser.admin) {
      return true;
    }

    if(foundPlanet.members && foundPlanet.members.includes(foundUser._id)) {
      return true;
    }

    if(foundPlanet.owner == foundUser._id) {
      return true;
    }

    return false;
  } else {
    throw new Error("server-missing-id");
  }
}

/**
 * Checks if the user has public write permission on the planet.
 * 
 * @param user The user to check. Takes an ID string or user object.
 * @param planet The planet to check. Takes an ID string or planet object.
 * 
 * @returns A promise that resolves to true if the user has public write permission, false otherwise.
 * 
 * @throws Throws an error if the planet is not found.
 * @throws Throws an error if the user is not found.
 */
async function checkPublicWritePermission(user: string | IUser, planet: string | IPlanet): Promise<boolean> {
  if (user && planet) {
    const foundUser = typeof(user) == "string" ? await Users.findOne({_id: user}) : user;

    if(foundUser == undefined) {
      throw new Error("Not found.");
    }

    if(foundUser && foundUser.banned) {
      return false;
    }

    if(foundUser && foundUser.admin) {
      return true;
    }

    const foundPlanet = typeof(planet) == "string" ? await Planets.findOne({_id: planet}) : planet;

    if(foundPlanet == undefined) {
      throw new Error("Not found.");
    }

    if(foundPlanet.banned && foundPlanet.banned.includes(foundUser._id)) {
      return false;
    }

    if(!foundPlanet.private) {
      return true;
    }

    if(foundPlanet.members && foundPlanet.members.includes(foundUser._id)) {
      return true;
    }

    if(foundPlanet.owner == foundUser._id) {
      return true;
    }

    return false;
  } else {
    throw new Error("missing-id");
  }
}

/**
 * Checks if the user has full write permission on the planet.
 * 
 * @param user The user to check. Takes an ID string or user object.
 * @param planet The planet to check. Takes an ID string or planet object.
 * 
 * @returns A promise that resolves to true if the user has full write permission, false otherwise.
 * 
 * @throws Throws an error if the planet is not found.
 * @throws Throws an error if the user is not found.
 */
async function checkFullWritePermission(user: string | IUser, planet: string | IPlanet): Promise<boolean> {
  if (user && planet) {
    const foundUser = typeof(user) == "string" ? await Users.findOne({_id: user}) : user;

    if(foundUser == undefined) {
      throw new Error("Not found.");
    }

    if(foundUser && foundUser.banned) {
      return false;
    }

    if(foundUser && foundUser.admin) {
      return true;
    }

    const foundPlanet = typeof(planet) == "string" ? await Planets.findOne({_id: planet}) : planet;

    if(foundPlanet == undefined) {
      throw new Error("Not found.");
    }

    if(foundPlanet.banned && foundPlanet.banned.includes(foundUser._id)) {
      return false;
    }

    if(foundPlanet.members && foundPlanet.members.includes(foundUser._id)) {
      return true;
    }

    if(foundPlanet.owner == foundUser._id) {
      return true;
    }

    return false;
  } else {
    throw new Error("Not found.");
  }
}

/**
 * Checks if the user has global admin permissions.
 * 
 * @param user The user to check. Takes an ID string.
 * 
 * @returns A promise that resolves to true if the user has global admin permissions, false otherwise.
 * 
 * @throws Throws an error if the user is not found.
 */
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