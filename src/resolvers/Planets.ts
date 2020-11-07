import Users, { IUser } from "../database/Users";
import Planets, { IPlanet } from "../database/Planets";
import permissions from "../util/permissions";
import Context from "../util/Context";
import Invites, { IInvite } from "../database/Invites";

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
async function insertPlanet(root: undefined, args: undefined, context: Context) {

}

async function addComponent(root: undefined, args: undefined, context: Context) {

}

async function followPlanet(root: undefined, args: undefined, context: Context) {

}

async function removeComponent(root: undefined, args: undefined, context: Context) {

}

async function updateName(root: undefined, args: undefined, context: Context) {

}

async function togglePrivate(root: undefined, args: undefined, context: Context) {

}

async function renameComponent(root: undefined, args: undefined, context: Context) {

}

async function applyModTools(root: undefined, args: undefined, context: Context) {

}

async function toggleBan(root: undefined, args: undefined, context: Context) {

}

export default {fieldResolvers, featuredPlanets, planet, adminPlanets, insertPlanet, addComponent, followPlanet, removeComponent, updateName, togglePrivate, renameComponent, applyModTools, toggleBan};