import Invites, { IInvite } from "../database/Invites";
import Planets, { IPlanet } from "../database/Planets";
import { IUser } from "../database/Users";
import Context from "../util/Context";
import permissions from "../util/permissions";

/**
 * Resolvers for the fields of the GraphQL type.
 */
const fieldResolvers = {
  owner: async (root: IInvite, args: undefined, context: Context): Promise<IUser> => {
    return context.loaders.userLoader.load(root.owner);
  },
  planet: async (root: IInvite, args: undefined, context: Context): Promise<IPlanet> => {
    return context.loaders.planetLoader.load(root.planet);
  }
};

/**
 * Arguments for {@link invite}.
 */
interface IInviteArgs {
  /** The ID of the invite */
  id: string
}

/**
 * Get a single invite.
 * 
 * @param root Unused.
 * @param args The arguments to be used to get the invite. See {@link IInviteArgs}.
 * 
 * @returns A promise that resolves to the invite.
 */
async function invite(root: undefined, args: IInviteArgs): Promise<IInvite> {
  return Invites.findOne({_id: args.id});
}

/**
 * Arguments for {@link insertInvite}.
 */
interface IInsertInviteArgs {
  /** The ID of the planet to be used. */
  planetId: string
}

/**
 * Creates a new invite.
 * 
 * @param root Unused.
 * @param args The arguments to be used to create the invite. See {@link IInsertInviteArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the invite.
 * 
 * @throws Throws an error if the user does not have full write permission on the target planet.
 * @throws Throws an error if the planet is not found.
 */
async function insertInvite(root: undefined, args: IInsertInviteArgs, context: Context): Promise<IInvite> {
  if(context.user && await permissions.checkFullWritePermission(context.user.id, args.planetId)) {
    const invite = new Invites({
      planet: args.planetId,
      owner: context.user.id,
      createdAt: new Date()
    });
    return invite.save();
  } else {
    throw new Error("Not found.");
  }
}

/**
 * Arguments for {@link useInvite}.
 */
interface IUseInviteArgs {
  /** The ID of the invite to be used. */
  inviteId: string
}

/**
 * Join a planet and remove the invite.
 * 
 * @param root Unused.
 * @param args The arguments to be used to join the planet. See {@link IUseInviteArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the planet.
 * 
 * @throws Throws an error if the user is not logged in.
 * @throws Throws an error if the invite is not found.
 * @throws Throws an error if the attached planet is not found.
 */
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

/**
 * Arguments for {@link removeInvite}.
 */
interface IRemoveInviteArgs {
  /** The ID of the invite to be removed. */
  inviteId: string
}

/**
 * Remove an invite from a planet.
 * 
 * @param root Unused.
 * @param args The arguments to be used to remove the invite. See {@link IRemoveInviteArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the planet.
 *
 * @throws Throws an error if the user is not logged in.
 * @throws Throws an error if the invite is not found.
 * @throws Throws an error if the user does not have full write permission on the target planet.
 * @throws Throws an error if the planet is not found.
 */
async function removeInvite(root: undefined, args: IRemoveInviteArgs, context: Context): Promise<IPlanet> {
  if(context.user && context.user.id) {
    const invite = await Invites.findOne({_id: args.inviteId});
    if(invite) {
      if(await permissions.checkFullWritePermission(context.user.id, invite.planet)) {
        const planet = await Planets.findOne({_id: invite.planet});
        await Invites.findOneAndDelete({_id: args.inviteId});
        return planet;
      } else {
        throw new Error("You don't have permission to do that.");
      }
    } else {
      throw new Error("That invite doesn't exist.");
    }
  } else {
    throw new Error("You need to be logged in to do that.");
  }
}

export default {fieldResolvers, invite, insertInvite, useInvite, removeInvite};