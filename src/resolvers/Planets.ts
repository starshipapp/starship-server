import Users, { IUser } from "../database/Users";
import Planets, { IPlanet } from "../database/Planets";
import permissions from "../util/permissions";
import IContext from "../util/IContext";
import Invites from "../database/Invites";

// QUERIES
async function memberPlanets(root, args, context: IContext): Promise<IPlanet[]> {
  if(context.user.id) {
    return Planets.find({
      $or: [
        {owner: context.user.id},
        {members: context.user.id}
      ]
    });
  }
}

async function followedPlanets(root, args, context: IContext): Promise<IPlanet[]> {
  if(context.user.id) {
    const user: IUser = await Users.findOne({_id: context.user.id});
    return Planets.find({_id: {$in: user.following}});
  }
}

async function featuredPlanets(): Promise<IPlanet[]> {
  return Planets.find({featured: true, private: false});
}

interface IPlanetArgs {
  id: string
}

async function planet(root, args: IPlanetArgs, context: IContext): Promise<IPlanet> {
  if(await permissions.checkReadPermission(context.user.id, args.id)) {
    return Planets.findOne({_id: args.id});
  }
}

interface IAdminPlanetsArgs {
  startNumber: number,
  count: number,
}

async function adminPlanets(root, args: IAdminPlanetsArgs, context: IContext): Promise<IPlanet[]> {
  if(await permissions.checkAdminPermission(context.user.id)) {
    return Planets.find({}).sort({createdAt: -1}).skip(args.startNumber).limit(args.count);
  }
}

interface IPlanetFromInviteArgs {
  inviteId: string
}

async function planetFromInvite(root, args: IPlanetFromInviteArgs, context: IContext): Promise<IPlanet> {
  const invite = await Invites.findOne({_id: args.inviteId});

  if(invite) {
    return Planets.findOne({_id: invite.planet});
  }
}

// MUTATIONS
async function insertPlanet(root, args, context: IContext) {

}

async function addComponent(root, args, context: IContext) {

}

async function followPlanet(root, args, context: IContext) {

}

async function removeComponent(root, args, context: IContext) {

}

async function updateName(root, args, context: IContext) {

}

async function togglePrivate(root, args, context: IContext) {

}

async function renameComponent(root, args, context: IContext) {

}

async function applyModTools(root, args, context: IContext) {

}

async function toggleBan(root, args, context: IContext) {

}

export default {memberPlanets, followedPlanets, featuredPlanets, planet, adminPlanets, planetFromInvite, insertPlanet, addComponent, followPlanet, removeComponent, updateName, togglePrivate, renameComponent, applyModTools, toggleBan};