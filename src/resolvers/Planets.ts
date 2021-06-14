import Users, { IUser } from "../database/Users";
import Planets, { IPlanet } from "../database/Planets";
import permissions from "../util/permissions";
import Context from "../util/Context";
import Invites, { IInvite } from "../database/Invites";
import ComponentIndex from "../util/ComponentIndex";
import createNotification from "../util/createNotification";
import CustomEmojis, { ICustomEmoji } from "../database/CustomEmojis";

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
async function featuredPlanets(): Promise<IPlanet[]> {
  return Planets.find({featured: true, private: false});
}

interface IPlanetArgs {
  id: string
}

async function planet(root: undefined, args: IPlanetArgs, context: Context): Promise<IPlanet> {
  if(await permissions.checkReadPermission(context.user?.id ?? null, args.id)) {
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
    throw new Error("Not found.");
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
      return Planets.findOneAndUpdate({_id: args.planetId}, {$pull: {components: {componentId: args.componentId}}}, {new: true});
    } else {
      throw new Error("That component doesn't exist");
    }
  } else {
    throw new Error("Not found.");
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
    return Planets.findOneAndUpdate({_id: args.planetId}, {$set: {private: !planet.private}}, {new: true});
  } else {
    throw new Error("Not found.");
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
    throw new Error("Not found.");
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
    const planet = await Planets.findOne({_id: args.planetId});
    if(planet) {
      if(args.featured && !planet.featured) {
        void createNotification(`Your planet ${planet.name} has been featured!`, "star", planet.owner);
      }
      if(args.verified && !planet.verified) {
        void createNotification(`Your planet ${planet.name} has been verified!`, "tick-circle", planet.owner);
      }
      if(args.partnered && !planet.partnered) {
        void createNotification(`Your planet ${planet.name} is now partnered!`, "unresolve", planet.owner);
      }
    }
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
      return Planets.findOneAndUpdate({_id: args.planetId}, {$pull: {banned: args.userId}}, {new: true});
    } else {
      return Planets.findOneAndUpdate({_id: args.planetId}, {$push: {banned: args.userId}}, {new: true});
    }
  } else {
    throw new Error("Not found.");
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
    throw new Error("Not found.");
  }
}

interface IRemoveMemberArgs {
  planetId: string,
  userId: string
}

async function removeMember(root: undefined, args: IRemoveMemberArgs, context: Context): Promise<IPlanet> {
  if(context.user && await permissions.checkFullWritePermission(context.user.id, args.planetId)) {
    return Planets.findOneAndUpdate({_id: args.planetId}, {$pull: {members: args.userId}}, {new: true});
  } else {
    throw new Error("Not found.");
  }
}

interface ISearchForPlanetArgs {
  searchText: string
}

async function searchForPlanets(root: undefined, args: ISearchForPlanetArgs): Promise<IPlanet[]> {
  if(args.searchText.length > 2) {
    return Planets.find({$text: {$search: args.searchText}, private: false}).sort({score: {$meta: "textScore"}}).limit(150);
  } else {
    throw new Error("Search text must be at least 3 characters long.");
  }
}

interface ISetDescriptionArgs {
  planetId: string,
  description: string
}

async function setDescription(root: undefined, args: ISetDescriptionArgs, context: Context): Promise<IPlanet> {
  if(context.user && await permissions.checkFullWritePermission(context.user.id, args.planetId)) {
    return Planets.findOneAndUpdate({_id: args.planetId}, {description: args.description}, {new: true});
  } else {
    throw new Error("Not found.");
  }
}

interface IDeletePlanetArgs {
  planetId: string
}

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