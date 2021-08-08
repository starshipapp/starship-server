import Context from "../../../util/Context";
import { IPlanet } from "../../../database/Planets";
import { IUser } from "../../../database/Users";
import permissions from "../../../util/permissions";
import Files, { IFiles } from "../../../database/components/files/Files";

// Files are often refered to as a generic component in this code.
// This is to differentiate the component from the actual files,
// which are stored in the FileObjects collection (FileObjects.ts)

/**
 * Resolvers for the fields of the GraphQL type.
 */
const fieldResolvers = {
  owner: async (root: IFiles, args: undefined, context: Context): Promise<IUser> => {
    return context.loaders.userLoader.load(root.owner);
  },
  planet: async (root: IFiles, args: undefined, context: Context): Promise<IPlanet> => {
    return context.loaders.planetLoader.load(root.planet);
  }
};

/**
 * Arguments for {@link fileComponent}.
 */
interface IFileComponentArgs {
  /* The ID of the file to retrieve. */
  id: string
}

/**
 * Gets a file component.
 * 
 * @param root Unused.
 * @param args The arguments to be used to get the file. See {@link IFileComponentArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the file component.
 * 
 * @throws Throws an error if the file does not exist.
 * @throws Throws an error if the user does not have read permission on the planet.
 */
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