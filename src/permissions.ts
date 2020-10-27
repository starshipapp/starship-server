import { PossibleFragmentSpreadsRule } from "graphql";
import { Planets } from "./database/Planets";
import { Users } from "./database/Users";

async function checkReadPermission(userId: String, planetId: String) {
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

    const planet = await Planets.findOne({_id: userId});

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

async function checkPublicWritePermission(userId: String, planetId: String) {
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

    const planet = await Planets.findOne({_id: userId});

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

async function checkFullWritePermission(userId: String, planetId: String) {
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

    const planet = await Planets.findOne({_id: userId});

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

async function checkAdminPermission(userId: String) {
  let user = null;

  user = await Users.findOne({_id: userId})

  if(user == undefined) {
    throw new Error("missing-user");
  }

  if(user && user.admin) {
    return true;
  }
  return false;
}

export {checkAdminPermission, checkReadPermission, checkPublicWritePermission, checkFullWritePermission}