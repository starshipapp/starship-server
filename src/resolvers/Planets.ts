import Users, { IUser } from "../database/Users";
import Planets, { IPlanet } from "../database/Planets";
import permissions from "../util/permissions";
import Context from "../util/Context";
import Invites, { IInvite } from "../database/Invites";
import ComponentIndex from "../util/ComponentIndex";

const fieldResolvers = {
  owner: async (root: IPlanet, args: undefined, context: Context): Promise<IUser> => {
    return context.loaders.userLoader.load(root.owner);
  },
  members: async (root: IPlanet, args: undefined, context: Context): Promise<IUser[]> => {
    const loaded = await context.loaders.userLoader.loadMany(root.members);
    return loaded as IUser[];
  },
  invites: async (root: IPlanet): Promise<IInvite[]> => {
    const loaded = await Invites.find({planet: root._id});
    return loaded;
  }
};

// QUERIES
async function featuredPlanets(): Promise<IPlanet[]> {
  return Planets.find({featured: true, private: false});
}

interface IPlanetArgs {
  id: string
}

async function planet(root: undefined, args: IPlanetArgs, context: Context): Promise<IPlanet> {
  if(await permissions.checkReadPermission(context.user.id, args.id)) {
    return Planets.findOne({_id: args.id});
  }
}

interface IAdminPlanetsArgs {
  startNumber: number,
  count: number,
}

async function adminPlanets(root: undefined, args: IAdminPlanetsArgs, context: Context): Promise<IPlanet[]> {
  if(await permissions.checkAdminPermission(context.user.id)) {
    return Planets.find({}).sort({createdAt: -1}).skip(args.startNumber).limit(args.count);
  }
}

// MUTATIONS
interface IInsertPlanetArgs {
  name: string,
  private: boolean
}

async function insertPlanet(root: undefined, args: IInsertPlanetArgs, context: Context): Promise<IPlanet> {
  if(context.user && context.user.id) {
    const planet = new Planets({
      name: args.name,
      createdAt: new Date(),
      owner: context.user.id,
      private: args.private,
      followerCount: 0,
      components: []
    });
    await planet.save();
    const homeComponent = await ComponentIndex.createComponent("page", planet._id, context.user.id);
    planet.homeComponent = {componentId: homeComponent._id, type: "page"};
    return planet.save();
  } else {
    throw new Error("You need to login.");
  }
}

interface IAddComponentArgs {
  planetId: string,
  name: string,
  type: string
}

async function addComponent(root: undefined, args: IAddComponentArgs, context: Context): Promise<IPlanet> {
  if(context.user && await permissions.checkFullWritePermission(context.user.id, args.planetId)) {
    const component = await ComponentIndex.createComponent(args.type, args.planetId, context.user.id);
    return Planets.findOneAndUpdate({_id: args.planetId}, {$push: {components: {name: args.name, componentId: component._id, type: args.type}}}, {new: true});
  }
}

interface IFollowPlanetArgs {
  planetId: string
}

async function followPlanet(root: undefined, args: IFollowPlanetArgs, context: Context): Promise<IPlanet> {
  if(context.user && await permissions.checkReadPermission(context.user.id, args.planetId)) {
    const planet = await Planets.findOne({_id: args.planetId});
    const user = await Users.findOne({_id: context.user.id});
    if(user.following && user.following.includes(planet._id)) {
      await Users.findOneAndUpdate({_id: user._id}, {$pull: {following: planet._id}});
      return Planets.findByIdAndUpdate({_id: planet._id}, {$inc: {followerCount: -1}}, {new: true});
    } else {
      await Users.findOneAndUpdate({_id: user._id}, {$push: {following: planet._id}});
      return Planets.findByIdAndUpdate({_id: planet._id}, {$inc: {followerCount: 1}}, {new: true});
    }
  } else {
    throw new Error("You don't have permission to do that.");
  }
}

interface IRemoveComponentArgs {
  planetId: string,
  componentId: string
}

async function removeComponent(root: undefined, args: IRemoveComponentArgs, context: Context): Promise<IPlanet> {
  if(context.user && await permissions.checkFullWritePermission(context.user.id, args.planetId)) {
    const planet = await Planets.findOne({_id: args.planetId});
    const filteredComponents = planet.components.filter(value => value.componentId === args.componentId);
    if(filteredComponents[0]) {
      await ComponentIndex.deleteComponent(filteredComponents[0].type, args.componentId);
      return Planets.update({_id: args.planetId}, {$pull: {components: {componentId: args.componentId}}}, {new: true});
    }
    return Planets.update({_id: args.planetId}, {$set: {private: !planet.private}}, {new: true});
  } else {
    throw new Error("You don't have permission to do that.");
  }
}

interface IUpdateNameArgs {
  planetId: string,
  name: string
}

async function updateName(root: undefined, args: IUpdateNameArgs, context: Context): Promise<IPlanet> {
  if(context.user && await permissions.checkFullWritePermission(context.user.id, args.planetId)) {
    return Planets.findOneAndUpdate({_id: args.planetId}, {$set: {name: args.name}}, {new: true});
  }
}

interface ITogglePrivateArgs {
  planetId: string
}

async function togglePrivate(root: undefined, args: ITogglePrivateArgs, context: Context): Promise<IPlanet> {
  if(context.user && await permissions.checkFullWritePermission(context.user.id, args.planetId)) {
    const planet = await Planets.findOne({_id: args.planetId});
    return Planets.update({_id: args.planetId}, {$set: {private: !planet.private}}, {new: true});
  } else {
    throw new Error("You don't have permission to do that.");
  }
}

interface IRenameComponentArgs {
  planetId: string,
  name: string,
  componentId: string
}

async function renameComponent(root: undefined, args: IRenameComponentArgs, context: Context): Promise<IPlanet> {
  if(context.user && await permissions.checkFullWritePermission(context.user.id, args.planetId)) {
    return Planets.findOneAndUpdate({_id: args.planetId, "components.componentId": args.componentId}, {$set: {"components.$.name": args.name}}, {new: true});
  } else {
    throw new Error("You don't have permission to do that.");
  }
}

interface IApplyModTools {
  planetId: string,
  featured: boolean,
  verified: boolean,
  partnered: boolean,
  featuredDescription: string
}

async function applyModTools(root: undefined, args: IApplyModTools, context: Context): Promise<IPlanet> {
  if(context.user && await permissions.checkAdminPermission(context.user.id)) {
    return Planets.findOneAndUpdate({_id: args.planetId}, {$set: {featuredDescription: args.featuredDescription, featured: args.featured, verified: args.verified, partnered: args.partnered}}, {new: true});
  } else {
    throw new Error("You are not a global moderator.");
  }
}

interface IToggleBanArgs {
  planetId: string,
  userId: string
}

async function toggleBan(root: undefined, args: IToggleBanArgs, context: Context): Promise<IPlanet> {
  if(context.user && await permissions.checkFullWritePermission(context.user.id, args.planetId) && !await permissions.checkFullWritePermission(args.userId, args.planetId)) {
    const planet = await Planets.findOne({_id: args.planetId});
    if(planet.banned && planet.banned.includes(args.userId)) {
      return Planets.update({_id: args.planetId}, {$pull: {banned: args.userId}}, {new: true});
    } else {
      return Planets.update({_id: args.planetId}, {$push: {banned: args.userId}}, {new: true});
    }
  } else {
    throw new Error("You don't have permission to do that.");
  }
}

interface ISetCSSArgs {
  planetId: string,
  css: string
}

async function setCSS(root: undefined, args: ISetCSSArgs, context: Context): Promise<IPlanet> {
  if(context.user && await permissions.checkFullWritePermission(context.user.id, args.planetId)) {
    return Planets.findOneAndUpdate({_id: args.planetId}, {$set: {css: args.css}}, {new: true});
  } else {
    throw new Error("You don't have permission to do that.");
  }
}

export default {fieldResolvers, featuredPlanets, planet, adminPlanets, insertPlanet, addComponent, followPlanet, removeComponent, updateName, togglePrivate, renameComponent, applyModTools, toggleBan, setCSS};