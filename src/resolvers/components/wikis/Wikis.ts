import Context from "../../../util/Context";
import { IPlanet } from "../../../database/Planets";
import { IUser } from "../../../database/Users";
import Wikis, { IWiki } from "../../../database/components/wiki/Wikis";
import permissions from "../../../util/permissions";
import WikiPages, { IWikiPage } from "../../../database/components/wiki/WikiPages";

const fieldResolvers = {
  owner: async (root: IWiki, args: undefined, context: Context): Promise<IUser> => {
    return context.loaders.userLoader.load(root.owner);
  },
  planet: async (root: IWiki, args: undefined, context: Context): Promise<IPlanet> => {
    return context.loaders.planetLoader.load(root.planet);
  },
  wikiPages: async (root: IWiki): Promise<IWikiPage[]> => {
    return WikiPages.find({wikiId: root._id});
  }
};

interface IWikiArgs {
  id: string
}

async function wiki(root: undefined, args: IWikiArgs, context: Context): Promise<IWiki> {
  const wiki = await Wikis.findOne({_id: args.id});
  if(wiki) {
    if(context.user && await permissions.checkReadPermission(context.user.id, wiki.planet)) {
      return wiki;
    } else {
      throw new Error("Not found.");
    }
  } else {
    throw new Error("Not found.");
  }
}


export {fieldResolvers, wiki};