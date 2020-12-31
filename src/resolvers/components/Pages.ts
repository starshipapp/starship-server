import Context from "../../util/Context";
import Pages, {IPage} from "../../database/components/Pages";
import permissions from "../../util/permissions";
import { IPlanet } from "../../database/Planets";
import { IUser } from "../../database/Users";

const fieldResolvers = {
  owner: async (root: IPage, args: undefined, context: Context): Promise<IUser> => {
    return context.loaders.userLoader.load(root.owner);
  },
  planet: async (root: IPage, args: undefined, context: Context): Promise<IPlanet> => {
    return context.loaders.planetLoader.load(root.planet);
  }
};

interface IPageArgs {
  id: string
}

async function page(root: undefined, args: IPageArgs, context: Context): Promise<IPage> {
  const page = await Pages.findOne({_id: args.id});
  if(page) {
    if(await permissions.checkReadPermission(context.user?.id ?? null, page.planet)) {
      return page;
    }
  } else {
    throw new Error("Not found.");
  }
}

interface IUpdatePageArgs {
  pageId: string,
  content: string
}

async function updatePage(root: undefined, args: IUpdatePageArgs, context: Context): Promise<IPage> {
  const page = await Pages.findOne({_id: args.pageId});
  if(page) {
    if(context.user && await permissions.checkFullWritePermission(context.user.id, page.planet)) {
      return Pages.findOneAndUpdate({_id: args.pageId}, {$set: {content: args.content}}, {new: true});
    } else {
      throw new Error("You don't have permission to do that.");
    }
  } else {
    throw new Error("Not found.");
  }
}

export default {fieldResolvers, page, updatePage};