import Context from "../../../util/Context";
import { IPlanet } from "../../../database/Planets";
import { IUser } from "../../../database/Users";
import permissions from "../../../util/permissions";
import Files, { IFiles } from "../../../database/components/files/Files";

// Files are often refered to as a generic component in this code.
// This is to differentiate the component from the actual files,
// which are stored in the FileObjects collection (FileObjects.ts)

const fieldResolvers = {
  owner: async (root: IFiles, args: undefined, context: Context): Promise<IUser> => {
    return context.loaders.userLoader.load(root.owner);
  },
  planet: async (root: IFiles, args: undefined, context: Context): Promise<IPlanet> => {
    return context.loaders.planetLoader.load(root.planet);
  }
};

interface IFileComponentArgs {
  id: string
}

async function fileComponent(root: undefined, args: IFileComponentArgs, context: Context): Promise<IFiles> {
  const files = await Files.findOne({_id: args.id});
  if(files) {
    if(await permissions.checkReadPermission(context.user?.id ?? null, files.planet)) {
      return files;
    } else {
      throw new Error("Not found.");
    }
  } else {
    throw new Error("Not found.");
  }
}


export default {fieldResolvers, fileComponent};