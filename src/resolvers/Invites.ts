import Invites, { IInvite } from "../database/Invites";
import Planets, { IPlanet } from "../database/Planets";
import { IUser } from "../database/Users";
import Context from "../util/Context";
import permissions from "../util/permissions";

const fieldResolvers = {
  owner: async (root: IInvite, args: undefined, context: Context): Promise<IUser> => {
    return context.loaders.userLoader.load(root.owner);
  },
  planet: async (root: IInvite, args: undefined, context: Context): Promise<IPlanet> => {
    return context.loaders.planetLoader.load(root.planet);
  }
};

interface IInviteArgs {
  id: string
}

async function invite(root: undefined, args: IInviteArgs): Promise<IInvite> {
  return Invites.findOne({_id: args.id});
}

interface IInsertInviteArgs {
  planetId: string
}

async function insertInvite(root: undefined, args: IInsertInviteArgs, context: Context): Promise<IInvite> {
  if(context.user && await permissions.checkFullWritePermission(context.user.id, args.planetId)) {
    const invite = new Invites({
      planet: args.planetId,
      owner: context.user.id,
      createdAt: new Date()
    });
    return invite.save();
  } else {
    throw new Error("You don't have permission to do that");
  }
}

interface IUseInviteArgs {
  inviteId: string
}

async function useInvite(root: undefined, args: IUseInviteArgs, context: Context): Promise<IPlanet> {
  if(context.user && context.user.id) {
    const invite = await Invites.findOne({_id: args.inviteId});
    if(invite) {
      const planet = await Planets.findOne({_id: invite.planet});
      if(planet && (!planet.members || !planet.members.includes(context.user.id))) {
        const updatedPlanet = Planets.findOneAndUpdate({_id: invite.planet}, {$push: {members: context.user.id}}, {new: true});
        await Invites.findOneAndDelete({_id: args.inviteId});
        return await updatedPlanet;
      } else {
        await Invites.findOneAndDelete({_id: args.inviteId});
        throw new Error("The planet attached to this invite doesn't exist, so the invite has now been deleted.");
      }
    } else {
      throw new Error("That invite doesn't exist.");
    }
  } else {
    throw new Error("You need to be logged in to do that.");
  }
}

export default {fieldResolvers, invite, insertInvite, useInvite};