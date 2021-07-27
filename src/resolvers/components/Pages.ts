import Context from "../../util/Context";
import Pages, {IPage} from "../../database/components/Pages";
import permissions from "../../util/permissions";
import { IPlanet } from "../../database/Planets";
import { IUser } from "../../database/Users";

/**
 * Resolvers for the fields of the GraphQL type.
 */
const fieldResolvers = {
  owner: async (root: IPage, args: undefined, context: Context): Promise<IUser> => {
    return context.loaders.userLoader.load(root.owner);
  },
  planet: async (root: IPage, args: undefined, context: Context): Promise<IPlanet> => {
    return context.loaders.planetLoader.load(root.planet);
  }
};

/**
 * Arguments for {@link page}.
 */
interface IPageArgs {
  /** The ID of the page to retrieve. */
  id: string
}

/**
 * Retrieves a page.
 * 
 * @param root Unused.
 * @param args The arguments to be used to retrieve the page. See {@link IPageArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the page.
 * 
 * @throws Throws an error if the page is not found.
 * @throws Throws an error if the user does not have read permission on the planet.
 */
async function page(root: undefined, args: IPageArgs, context: Context): Promise<IPage> {
  const page = await Pages.findOne({_id: args.id});
  if(page) {
    if(await permissions.checkReadPermission(context.user?.id ?? null, page.planet)) {
      return page;
    } else {
      throw new Error("Not found.");
    }
  } else {
    throw new Error("Not found.");
  }
}

/**
 * Arguments for {@link updatePage}.
 */
interface IUpdatePageArgs {
  /** The ID of the page to update. */
  pageId: string,
  /** The new content of the page. */
  content: string
}

/**
 * Updates a page.
 * 
 * @param root Unused.
 * @param args The arguments to be used to update the page. See {@link IUpdatePageArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the updated page.
 * 
 * @throws Throws an error if the page is not found.
 * @throws Throws an error if the user does not have full write permission on the planet.
 */
async function updatePage(root: undefined, args: IUpdatePageArgs, context: Context): Promise<IPage> {
  const page = await Pages.findOne({_id: args.pageId});
  if(page) {
    if(context.user && await permissions.checkFullWritePermission(context.user.id, page.planet)) {
      return Pages.findOneAndUpdate({_id: args.pageId}, {$set: {content: args.content}}, {new: true});
    } else {
      throw new Error("Not found.");
    }
  } else {
    throw new Error("Not found.");
  }
}

export default {fieldResolvers, page, updatePage};