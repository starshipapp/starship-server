import Users, { IUser } from "../database/Users";
import Planets, { IPlanet } from "../database/Planets";
import permissions from "../util/permissions";
import Context from "../util/Context";
import Invites, { IInvite } from "../database/Invites";
import ComponentIndex from "../util/ComponentIndex";
import createNotification from "../util/createNotification";
import CustomEmojis, { ICustomEmoji } from "../database/CustomEmojis";

/**
 * Resolvers for the fields of the GraphQL type.
 */
const fieldResolvers = {
  owner: async (root: IPlanet, args: undefined, context: Context): Promise<IUser> => {
    return context.loaders.userLoader.load(root.owner);
  },
  members: async (root: IPlanet, args: undefined, context: Context): Promise<IUser[]> => {
    const loaded = await context.loaders.userLoader.loadMany(root.members);
    return loaded as IUser[];
  },
  invites: async (root: IPlanet, args: undefined, context: Context): Promise<IInvite[]> => {
    if(await permissions.checkFullWritePermission(context.user.id, root.id)) {
      const loaded = await Invites.find({planet: root._id});
      return loaded;
    } else {
      return [];
    }
  },
  customEmojis: async (root: IPlanet): Promise<ICustomEmoji[]> => {
    if(root._id) {
      return CustomEmojis.find({planet: root._id});
    }
  },
};

// QUERIES
/**
 * Gets a list of featured planets.
 *
 * @returns A promise that resolves to an array of featured planets.
 */
async function featuredPlanets(): Promise<IPlanet[]> {
  return Planets.find({featured: true, private: false});
}

/**
 * Arguments for {@link insertPlanet}.
 */
interface IPlanetArgs {
  /** The ID of the planet. */
  id: string
}

/**
 * Gets a planet.
 * 
 * @param root Unused.
 * @param args The arguments to be used to get the planet. See {@link IPlanetArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the planet.
 * 
 * @throws Throws an error if the planet is not found.
 * @throws Throws an error if the user does not have permission to view the planet.
 */
async function planet(root: undefined, args: IPlanetArgs, context: Context): Promise<IPlanet> {
  if(await permissions.checkReadPermission(context.user?.id ?? null, args.id)) {
    return Planets.findOne({_id: args.id});
  } else {
    throw new Error("Not found.");
  }
}

/**
 * Arguments for {@link adminPlanets}.
 */
interface IAdminPlanetsArgs {
  /** The start number of the range of planets to get. */
  startNumber: number,
  /** The number of planets to get. */
  count: number,
}

/**
 * Gets a list of all the planets in a given range.
 * 
 * @param root Unused.
 * @param args The arguments to be used to get the planets. See {@link IAdminPlanetsArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to an array of planets.
 * 
 * @throws Throws an error if the user is not an administrator.
 */
async function adminPlanets(root: undefined, args: IAdminPlanetsArgs, context: Context): Promise<IPlanet[]> {
  if(await permissions.checkAdminPermission(context.user.id)) {
    return Planets.find({}).sort({createdAt: -1}).skip(args.startNumber).limit(args.count);
  }
}

// MUTATIONS
/**
 * Arguments for {@link insertPlanet}.
 */
interface IInsertPlanetArgs {
  /** The planet's name. */
  name: string,
  /** Whether or not the planet is private. */
  private: boolean
}

/**
 * Creates a new planet.
 * 
 * @param root Unused.
 * @param args The arguments to be used to create the planet. See {@link IInsertPlanetArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the newly created planet.
 * 
 * @throws Throws an error if the user is not logged in.
 */
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
    throw new Error("Not logged in.");
  }
}

/**
 * Arguments for {@link addComponent}.
 */
interface IAddComponentArgs {
  /** The planet to add the component to. */
  planetId: string,
  /** The name of the new component. */
  name: string,
  /** The type of the new component. */
  type: string
}

/**
 * Adds a component to a planet.
 * 
 * @param root Unused.
 * @param args The arguments to be used to add the component. See {@link IAddComponentArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the newly created component.
 * 
 * @throws Throws an error if the user does not have full write permission on the planet.
 * @throws Throws an error if the planet is not found.
 */
async function addComponent(root: undefined, args: IAddComponentArgs, context: Context): Promise<IPlanet> {
  if(context.user && await permissions.checkFullWritePermission(context.user.id, args.planetId)) {
    const component = await ComponentIndex.createComponent(args.type, args.planetId, context.user.id);
    return Planets.findOneAndUpdate({_id: args.planetId}, {$push: {components: {name: args.name, componentId: component._id, type: args.type}}}, {new: true});
  } else {
    throw new Error("Not found.");
  }
}

/**
 * Arguments for {@link followPlanet}.
 */
interface IFollowPlanetArgs {
  /** The planet to follow. */
  planetId: string
}

/**
 * Follows a planet.
 * 
 * @param root Unused.
 * @param args The arguments to be used to follow the planet. See {@link IFollowPlanetArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the newly created follow.
 * 
 * @throws Throws an error if the user is not logged in.
 * @throws Throws an error if the user does not have read permission on the planet.
 * @throws Throws an error if the planet is not found.
 */
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
    throw new Error("Not found.");
  }
}

/**
 * Arguments for {@link removeComponent}.
 */
interface IRemoveComponentArgs {
  /** The planet to remove the component from. */
  planetId: string,
  /** The component to remove. */
  componentId: string
}

/**
 * Removes a component from a planet.
 * 
 * @param root Unused.
 * @param args The arguments to be used to remove the component. See {@link IRemoveComponentArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the planet.
 * 
 * @throws Throws an error if the user does not have full write permission on the planet.
 * @throws Throws an error if the planet is not found.
 * @throws Throws an error if the component is not found.
 */
async function removeComponent(root: undefined, args: IRemoveComponentArgs, context: Context): Promise<IPlanet> {
  if(context.user && await permissions.checkFullWritePermission(context.user.id, args.planetId)) {
    const planet = await Planets.findOne({_id: args.planetId});
    const filteredComponents = planet.components.filter(value => value.componentId === args.componentId);
    if(filteredComponents[0]) {
      await ComponentIndex.deleteComponent(filteredComponents[0].type, args.componentId);
      return Planets.findOneAndUpdate({_id: args.planetId}, {$pull: {components: {componentId: args.componentId}}}, {new: true});
    } else {
      throw new Error("That component doesn't exist");
    }
  } else {
    throw new Error("Not found.");
  }
}

/**
 * Arguments for {@link updateName}.
 */
interface IUpdateNameArgs {
  /** The planet to update the name of. */
  planetId: string,
  /** The new name of the planet. */
  name: string
}

/**
 * Updates the name of a planet.
 * 
 * @param root Unused.
 * @param args The arguments to be used to update the planet. See {@link IUpdateNameArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the planet.
 * 
 * @throws Throws an error if the user does not have full write permission on the planet.
 * @throws Throws an error if the planet is not found.
 */
async function updateName(root: undefined, args: IUpdateNameArgs, context: Context): Promise<IPlanet> {
  if(context.user && await permissions.checkFullWritePermission(context.user.id, args.planetId)) {
    return Planets.findOneAndUpdate({_id: args.planetId}, {$set: {name: args.name}}, {new: true});
  } else {
    throw new Error("Not found.");
  }
}

/**
 * Arguments for {@link togglePrivate}.
 */
interface ITogglePrivateArgs {
  /** The planet to toggle the private status of. */
  planetId: string
}

/**
 * Toggles the private status of a planet.
 * 
 * @param root Unused.
 * @param args The arguments to be used to toggle the private status of the planet. See {@link ITogglePrivateArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the planet.
 * 
 * @throws Throws an error if the user does not have full write permission on the planet.
 * @throws Throws an error if the planet is not found.
 */
async function togglePrivate(root: undefined, args: ITogglePrivateArgs, context: Context): Promise<IPlanet> {
  if(context.user && await permissions.checkFullWritePermission(context.user.id, args.planetId)) {
    const planet = await Planets.findOne({_id: args.planetId});
    return Planets.findOneAndUpdate({_id: args.planetId}, {$set: {private: !planet.private}}, {new: true});
  } else {
    throw new Error("Not found.");
  }
}

/**
 * Arguments for {@link renameComponent}.
 */
interface IRenameComponentArgs {
  /** The planet to rename the component on. */
  planetId: string,
  /** The new name of the component. */
  name: string,
  /** The component to rename. */
  componentId: string
}

/**
 * Renames a component.
 * 
 * @param root Unused.
 * @param args The arguments to be used to rename the component. See {@link IRenameComponentArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the planet.
 * 
 * @throws Throws an error if the user does not have full write permission on the planet.
 * @throws Throws an error if the planet is not found.
 */
async function renameComponent(root: undefined, args: IRenameComponentArgs, context: Context): Promise<IPlanet> {
  if(context.user && await permissions.checkFullWritePermission(context.user.id, args.planetId)) {
    return Planets.findOneAndUpdate({_id: args.planetId, "components.componentId": args.componentId}, {$set: {"components.$.name": args.name}}, {new: true});
  } else {
    throw new Error("Not found.");
  }
}

/**
 * Arguments for {@link applyModTools}.
 */
interface IApplyModTools {
  /** The planet to apply the mod tools to. */
  planetId: string,
  /** Whether or not the planet should be featured. */
  featured: boolean,
  /** Whether or not the planet should be verified. */
  verified: boolean,
  /** Whether or not the planet should be partnered. */
  partnered: boolean,
  /** The description of the planet to be shown in the featured planet list. */
  featuredDescription: string
}

/**
 * Applies the mod tools to a planet.
 * 
 * @param root Unused.
 * @param args The arguments to be used to apply the mod tools. See {@link IApplyModTools}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the planet.
 * 
 * @throws Throws an error if the user does not have global admin permission.
 * @throws Throws an error if the planet is not found.
 */
async function applyModTools(root: undefined, args: IApplyModTools, context: Context): Promise<IPlanet> {
  if(context.user && await permissions.checkAdminPermission(context.user.id)) {
    const planet = await Planets.findOne({_id: args.planetId});
    if(planet) {
      // send notifications
      if(args.featured && !planet.featured) {
        void createNotification(`Your planet ${planet.name} has been featured!`, "star", planet.owner);
      }
      if(args.verified && !planet.verified) {
        void createNotification(`Your planet ${planet.name} has been verified!`, "tick-circle", planet.owner);
      }
      if(args.partnered && !planet.partnered) {
        void createNotification(`Your planet ${planet.name} is now partnered!`, "unresolve", planet.owner);
      }

      return Planets.findOneAndUpdate({_id: args.planetId}, {$set: {featuredDescription: args.featuredDescription, featured: args.featured, verified: args.verified, partnered: args.partnered}}, {new: true});
    } else {
      throw new Error("Not found.");
    }
  } else {
    throw new Error("You are not a global moderator.");
  }
}

/**
 * Arguments for {@link toggleBan}.
 */
interface IToggleBanArgs {
  /** The target planet to ban the user from. */
  planetId: string,
  /** The user to ban. */
  userId: string
}

/**
 * Toggles the ban status of a user on a planet.
 * 
 * @param root Unused.
 * @param args The arguments to be used to toggle the ban status of the user. See {@link IToggleBanArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the planet.
 * 
 * @throws Throws an error if the user does not have full write permission on the planet.
 * @throws Throws an error if the planet is not found.
 */
async function toggleBan(root: undefined, args: IToggleBanArgs, context: Context): Promise<IPlanet> {
  if(context.user && await permissions.checkFullWritePermission(context.user.id, args.planetId) && !await permissions.checkFullWritePermission(args.userId, args.planetId)) {
    const planet = await Planets.findOne({_id: args.planetId});
    if(planet.banned && planet.banned.includes(args.userId)) {
      return Planets.findOneAndUpdate({_id: args.planetId}, {$pull: {banned: args.userId}}, {new: true});
    } else {
      return Planets.findOneAndUpdate({_id: args.planetId}, {$push: {banned: args.userId}}, {new: true});
    }
  } else {
    throw new Error("Not found.");
  }
}

/**
 * Arguments for {@link setCSS}.
 */
interface ISetCSSArgs {
  /** The target planet to set the CSS on. */
  planetId: string,
  /** The new stylesheet. */
  css: string
}

/**
 * Changes a planet's stylesheet.
 * 
 * @param root Unused.
 * @param args The arguments to be used to change the planet's stylesheet. See {@link ISetCSSArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the planet.
 * 
 * @throws Throws an error if the user does not have full write permission on the planet.
 * @throws Throws an error if the planet is not found.
 */
async function setCSS(root: undefined, args: ISetCSSArgs, context: Context): Promise<IPlanet> {
  if(context.user && await permissions.checkFullWritePermission(context.user.id, args.planetId)) {
    return Planets.findOneAndUpdate({_id: args.planetId}, {$set: {css: args.css}}, {new: true});
  } else {
    throw new Error("Not found.");
  }
}

/**
 * Arguments for {@link removeMember}.
 */
interface IRemoveMemberArgs {
  /** The target planet to remove the user from. */
  planetId: string,
  /** The user to remove. */
  userId: string
}

/**
 * Removes a user from a planet's member list.
 * 
 * @param root Unused.
 * @param args The arguments to be used to remove the user from the planet's member list. See {@link IRemoveMemberArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the planet.
 * 
 * @throws Throws an error if the user does not have full write permission on the planet.
 * @throws Throws an error if the planet is not found.
 */
async function removeMember(root: undefined, args: IRemoveMemberArgs, context: Context): Promise<IPlanet> {
  if(context.user && await permissions.checkFullWritePermission(context.user.id, args.planetId)) {
    return Planets.findOneAndUpdate({_id: args.planetId}, {$pull: {members: args.userId}}, {new: true});
  } else {
    throw new Error("Not found.");
  }
}

/**
 * Arguments for {@link searchForPlanets}.
 */
interface ISearchForPlanetArgs {
  /** The search query. */
  searchText: string
}

/**
 * Searches for planets.
 * 
 * @param root Unused.
 * @param args The arguments to be used to search for planets. See {@link ISearchForPlanetArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the planets.
 * 
 * @throws Throws an error if the search text is not 3 characters or more in length.
 */
async function searchForPlanets(root: undefined, args: ISearchForPlanetArgs): Promise<IPlanet[]> {
  if(args.searchText.length > 2) {
    return Planets.find({$text: {$search: args.searchText}, private: false}).sort({score: {$meta: "textScore"}}).limit(150);
  } else {
    throw new Error("Search text must be at least 3 characters long.");
  }
}

/**
 * Arguments for {@link setDescription}.
 */
interface ISetDescriptionArgs {
  /** The target planet to set the description on. */
  planetId: string,
  /** The new description. */
  description: string
}

/**
 * Sets the description of a planet.
 * 
 * @param root Unused.
 * @param args The arguments to be used to set the description of the planet. See {@link ISetDescriptionArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the planet.
 * 
 * @throws Throws an error if the user does not have full write permission on the planet.
 * @throws Throws an error if the planet is not found.
 */
async function setDescription(root: undefined, args: ISetDescriptionArgs, context: Context): Promise<IPlanet> {
  if(context.user && await permissions.checkFullWritePermission(context.user.id, args.planetId)) {
    return Planets.findOneAndUpdate({_id: args.planetId}, {description: args.description}, {new: true});
  } else {
    throw new Error("Not found.");
  }
}

/**
 * Arguments for {@link deletePlanet}.
 */
interface IDeletePlanetArgs {
  /** The target planet to delete. */
  planetId: string
}

/**
 * Deletes a planet.
 * 
 * @param root Unused.
 * @param args The arguments to be used to delete the planet. See {@link IDeletePlanetArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to true if the planet was sucessfully deleted.
 * 
 * @throws Throws an error if the user does not have full write permission on the planet.
 * @throws Throws an error if the planet is not found.
 */
async function deletePlanet(root: undefined, args: IDeletePlanetArgs, context: Context): Promise<boolean> {
  if(context.user && await permissions.checkFullWritePermission(context.user.id, args.planetId)) {
    const planet = await Planets.findOneAndDelete({_id: args.planetId});
    await Users.findOneAndUpdate({following: args.planetId}, {$pull: {following: args.planetId}});
    if(planet) {
      for(const component of planet.components) {
        void ComponentIndex.deleteComponent(component.type, component.componentId);
      }
      await CustomEmojis.deleteMany({planet: planet._id});
      return true;
    } else {
      throw new Error("Not found.");
    }
  } else {
    throw new Error("Not found.");
  }
}

export default {fieldResolvers, deletePlanet, setDescription, searchForPlanets, featuredPlanets, planet, adminPlanets, insertPlanet, addComponent, followPlanet, removeComponent, updateName, togglePrivate, renameComponent, applyModTools, toggleBan, setCSS, removeMember};