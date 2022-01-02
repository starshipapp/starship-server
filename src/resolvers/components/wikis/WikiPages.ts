import WikiPages, { IWikiPage } from "../../../database/components/wiki/WikiPages";
import Wikis, { IWiki } from "../../../database/components/wiki/Wikis";
import { IPlanet } from "../../../database/Planets";
import Context from "../../../util/Context";
import permissions from "../../../util/permissions";

/**
 * Resolvers for the fields of the GraphQL type.
 */
const fieldResolvers = {
  planet: async (root: IWikiPage, args: undefined, context: Context): Promise<IPlanet> => {
    return context.loaders.planetLoader.load(root.planet);
  },
  wiki: async (root: IWikiPage): Promise<IWiki> => {
    return Wikis.findOne({_id: root.wikiId});
  }
};

/**
 * Arguments for {@link wikiPage}
 */
interface IWikiPageArgs {
  /** The ID of the wiki page to retrieve. */
  id: string
}

/**
 * Gets a wiki page.
 * 
 * @param root Unused.
 * @param args The arguments to be used to get the wiki page. See {@link IWikiPageArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the wiki page.
 * 
 * @throws Throws an error if the wiki page is not found.
 * @throws Throws an error if the user does not have read permission on the planet.
 */
async function wikiPage(root: undefined, args: IWikiPageArgs, context: Context): Promise<IWikiPage> {
  const wikiPage = await WikiPages.findOne({_id: args.id});
  if(wikiPage) {
    if(await permissions.checkReadPermission(context.user?.id ?? null, wikiPage.planet)) {
      return wikiPage;
    } else {
      throw new Error("Not found.");
    }
  } else {
    throw new Error("Not found.");
  }
}

/**
 * Arguments for {@link insertWikiPage}.
 */
interface IInsertWikiPageArgs {
  content: string,
  wikiId: string,
  name: string
}

/**
 * Creates a new wiki page.
 * 
 * @param root Unused.
 * @param args The arguments to be used to create the wiki page. See {@link IInsertWikiPageArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the new wiki page.
 * 
 * @throws Throws an error if the user does not have full write permission on the planet.
 * @throws Throws an error if the wiki does not exist.
 */
async function insertWikiPage(root: undefined, args: IInsertWikiPageArgs, context: Context): Promise<IWikiPage> {
  const wiki = await Wikis.findOne({_id: args.wikiId});
  if(wiki) {
    if(context.user && await permissions.checkFullWritePermission(context.user?.id ?? null, wiki.planet)) {
      const wikiPage = new WikiPages({
        wikiId: args.wikiId,
        name: args.name,
        content: args.content,
        createdAt: new Date(),
        planet: wiki.planet
      });
      await wikiPage.save();
      return wikiPage;
    } else {
      throw new Error("Not found.");
    }
  } else {
    throw new Error("Not found.");
  }
}

/**
 * Arguments for {@link updateWikiPage}.
 */
interface IUpdateWikiPageArgs {
  /** The ID of the wiki page to update. */
  pageId: string,
  /** The new content of the wiki page. */
  newContent: string
}

/**
 * Updates the content of a wiki page.
 * 
 * @param root Unused.
 * @param args The arguments to be used to update the wiki page. See {@link IUpdateWikiPageArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the updated wiki page.
 * 
 * @throws Throws an error if the user does not have full write permission on the planet.
 * @throws Throws an error if the wiki page does not exist.
 */
async function updateWikiPage(root: undefined, args: IUpdateWikiPageArgs, context: Context): Promise<IWikiPage> {
  const wikiPage = await WikiPages.findOne({_id: args.pageId});
  if(wikiPage) {
    if(context.user && await permissions.checkFullWritePermission(context.user.id, wikiPage.planet)) {
      return WikiPages.findOneAndUpdate({_id: args.pageId}, {content: args.newContent}, {new: true});
    } else {
      throw new Error("Not found.");
    }
  } else {
    throw new Error("Not found.");
  }
}

/**
 * Arguments for {@link removeWikiPage}.
 */
interface IRemoveWikiPageArgs {
  /** The ID of the wiki page to remove. */
  pageId: string
}

/**
 * Removes a wiki page.
 * 
 * @param root Unused.
 * @param args The arguments to be used to remove the wiki page. See {@link IRemoveWikiPageArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the removed wiki page.
 * 
 * @throws Throws an error if the user does not have full write permission on the planet.
 * @throws Throws an error if the wiki page does not exist.
 */
async function removeWikiPage(root: undefined, args: IRemoveWikiPageArgs, context: Context): Promise<IWiki> {
  const wikiPage = await WikiPages.findOne({_id: args.pageId});
  if(wikiPage) {
    if(context.user && await permissions.checkFullWritePermission(context.user.id, wikiPage.planet)) {
      const findId = wikiPage.wikiId;
      await WikiPages.findOneAndDelete({_id: args.pageId});
      return Wikis.findOne({_id: findId});
    } else {
      throw new Error("Not found.");
    }
  } else {
    throw new Error("Not found.");
  }
}

/**
 * Arguments for {@link renameWikiPage}.
 */
interface IRenameWikiPageArgs {
  /** The ID of the wiki page to rename. */
  pageId: string,
  /** The new name of the wiki page. */
  newName: string
}

/**
 * Renames a wiki page.
 * 
 * @param root Unused.
 * @param args The arguments to be used to rename the wiki page. See {@link IRenameWikiPageArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the renamed wiki page.
 * 
 * @throws Throws an error if the user does not have full write permission on the planet.
 * @throws Throws an error if the wiki page does not exist.
 */
async function renameWikiPage(root: undefined, args: IRenameWikiPageArgs, context: Context): Promise<IWikiPage> {
  const wikiPage = await WikiPages.findOne({_id: args.pageId});
  if(wikiPage) {
    if(context.user && await permissions.checkFullWritePermission(context.user.id, wikiPage.planet)) {
      return WikiPages.findOneAndUpdate({_id: args.pageId}, {name: args.newName}, {new: true});
    } else {
      throw new Error("Not found.");
    }
  } else {
    throw new Error("Not found.");
  }
}

export default {fieldResolvers, wikiPage, insertWikiPage, updateWikiPage, removeWikiPage, renameWikiPage};