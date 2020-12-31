import WikiPages, { IWikiPage } from "../../../database/components/wiki/WikiPages";
import Wikis, { IWiki } from "../../../database/components/wiki/Wikis";
import { IPlanet } from "../../../database/Planets";
import Context from "../../../util/Context";
import permissions from "../../../util/permissions";

const fieldResolvers = {
  planet: async (root: IWikiPage, args: undefined, context: Context): Promise<IPlanet> => {
    return context.loaders.planetLoader.load(root.planet);
  },
  wiki: async (root: IWikiPage): Promise<IWiki> => {
    return Wikis.findOne({_id: root.wikiId});
  }
};


interface IWikiPageArgs {
  id: string
}

async function wikiPage(root: undefined, args: IWikiPageArgs, context: Context): Promise<IWikiPage> {
  const wikiPage = await WikiPages.findOne({_id: args.id});
  if(wikiPage) {
    if(await permissions.checkReadPermission(context.user?.id ?? null, wikiPage.planet)) {
      return wikiPage;
    } else {
      throw new Error("That page doesn't exist.");
    }
  } else {
    throw new Error("That page doesn't exist.");
  }
}

interface IInsertWikiPageArgs {
  content: string,
  wikiId: string,
  name: string
}

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
      throw new Error("That page group doesn't exist.");
    }
  } else {
    throw new Error("That page group doesn't exist.");
  }
}

interface IUpdateWikiPageArgs {
  pageId: string,
  newContent: string
}

async function updateWikiPage(root: undefined, args: IUpdateWikiPageArgs, context: Context): Promise<IWikiPage> {
  const wikiPage = await WikiPages.findOne({_id: args.pageId});
  if(wikiPage) {
    if(context.user && await permissions.checkFullWritePermission(context.user.id, wikiPage.planet)) {
      return WikiPages.findOneAndUpdate({_id: args.pageId}, {content: args.newContent}, {new: true});
    } else {
      throw new Error("That page doesn't exist.");
    }
  } else {
    throw new Error("That page doesn't exist.");
  }
}

interface IRemoveWikiPageArgs {
  pageId: string
}

async function removeWikiPage(root: undefined, args: IRemoveWikiPageArgs, context: Context): Promise<IWiki> {
  const wikiPage = await WikiPages.findOne({_id: args.pageId});
  if(wikiPage) {
    if(context.user && await permissions.checkFullWritePermission(context.user.id, wikiPage.planet)) {
      const findId = wikiPage.wikiId;
      await WikiPages.findOneAndDelete({_id: args.pageId});
      return Wikis.findOne({_id: findId});
    } else {
      throw new Error("That page doesn't exist.");
    }
  } else {
    throw new Error("That page doesn't exist.");
  }
}

interface IRenameWikiPageArgs {
  pageId: string,
  newName: string
}

async function renameWikiPage(root: undefined, args: IRenameWikiPageArgs, context: Context): Promise<IWikiPage> {
  const wikiPage = await WikiPages.findOne({_id: args.pageId});
  if(wikiPage) {
    if(context.user && await permissions.checkFullWritePermission(context.user.id, wikiPage.planet)) {
      return WikiPages.findOneAndUpdate({_id: args.pageId}, {name: args.newName}, {new: true});
    } else {
      throw new Error("That page doesn't exist.");
    }
  } else {
    throw new Error("That page doesn't exist.");
  }
}

export default {fieldResolvers, wikiPage, insertWikiPage, updateWikiPage, removeWikiPage, renameWikiPage};