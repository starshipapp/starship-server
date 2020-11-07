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
  name: string
}

async function insertPlanet(root: undefined, args: IInsertPlanetArgs, context: Context): Promise<IPlanet> {
  if(context.user && context.user.id) {
    const planet = new Planets({
      name: args.name,
      createdAt: new Date(),
      owner: context.user.id,
      private: false,
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

async function followPlanet(root: undefined, args: undefined, context: Context) {

}

async function removeComponent(root: undefined, args: undefined, context: Context) {

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

async function togglePrivate(root: undefined, args: undefined, context: Context) {

}

interface IRenameComponentArgs {
  planetId: string,
  name: string,
  componentId: string
}

async function renameComponent(root: undefined, args: IRenameComponentArgs, context: Context): Promise<IPlanet> {
  if(context.user && await permissions.checkFullWritePermission(context.user.id, args.planetId)) {
    return Planets.findOneAndUpdate({_id: args.planetId, "components.componentId": args.componentId}, {$set: {"components.$.name": args.name}}, {new: true});
  }
}

async function applyModTools(root: undefined, args: undefined, context: Context) {

}

async function toggleBan(root: undefined, args: undefined, context: Context) {

}

export default {fieldResolvers, featuredPlanets, planet, adminPlanets, insertPlanet, addComponent, followPlanet, removeComponent, updateName, togglePrivate, renameComponent, applyModTools, toggleBan};