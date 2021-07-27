import Context from "../../../util/Context";
import { IPlanet } from "../../../database/Planets";
import { IUser } from "../../../database/Users";
import Wikis, { IWiki } from "../../../database/components/wiki/Wikis";
import permissions from "../../../util/permissions";
import WikiPages, { IWikiPage } from "../../../database/components/wiki/WikiPages";

/**
 * Resolvers for the fields of the GraphQL type.
 */
const fieldResolvers = {
  owner: async (root: IWiki, args: undefined, context: Context): Promise<IUser> => {
    return context.loaders.userLoader.load(root.owner);
  },
  planet: async (root: IWiki, args: undefined, context: Context): Promise<IPlanet> => {
    return context.loaders.planetLoader.load(root.planet);
  },
  pages: async (root: IWiki): Promise<IWikiPage[]> => {
    return WikiPages.find({wikiId: root._id}).sort({ createdAt: 1 });
  }
};

/**
 * Arguments for {@link wiki}.
 */
interface IWikiArgs {
  /** The ID of the wiki to retrieve. */
  id: string
}

/**
 * Gets a wiki component.
 * 
 * @param root Unused.
 * @param args The arguments to be used to retrieve the wiki. See {@link IWikiArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the wiki component.
 * 
 * @throws Throws an error if the wiki is not found.
 * @throws Throws an error if the user does not have read permission on the planet.
 */
async function wiki(root: undefined, args: IWikiArgs, context: Context): Promise<IWiki> {
  const wiki = await Wikis.findOne({_id: args.id});
  if(wiki) {
    if(await permissions.checkReadPermission(context.user?.id ?? null, wiki.planet)) {
      return wiki;
    } else {
      throw new Error("Not found.");
    }
  } else {
    throw new Error("Not found.");
  }
}


export default {fieldResolvers, wiki};
