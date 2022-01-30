import { UserInputError } from "apollo-server-errors";
import FileObjects, { IFileObject } from "../../../database/components/files/FileObjects";
import Files, { IFiles } from "../../../database/components/files/Files";
import MultiObjectTickets from "../../../database/components/files/MultiObjectTickets";
import { IPlanet } from "../../../database/Planets";
import { IUser } from "../../../database/Users";
import Context from "../../../util/Context";
import { NotFoundError } from "../../../util/NotFoundError";
import permissions from "../../../util/permissions";

/**
 * Resolvers for the fields of the GraphQL type.
 */
const fieldResolvers = {
  owner: async (root: IFileObject, args: undefined, context: Context): Promise<IUser> => {
    return context.loaders.userLoader.load(root.owner);
  },
  planet: async (root: IFileObject, args: undefined, context: Context): Promise<IPlanet> => {
    return context.loaders.planetLoader.load(root.planet);
  },
  parent: async (root: IFileObject, args: undefined, context: Context): Promise<IFileObject | null> => {
    if(root.parent != "root") {
      return context.loaders.fileObjectLoader.load(root.parent);
    } else {
      return;
    }
  },
  component: async (root: IFileObject): Promise<IFiles> => {
    return Files.findOne({_id: root.componentId});
  }
};

/**
 * Arguments for {@link fileObject}.
 */
interface IFileObjectArgs {
  /* The ID of the file object to retrieve. */
  id: string
}

/**
 * Gets a file object.
 * 
 * @param root Unused.
 * @param args The arguments to be used to get the file object. See {@link IFileObjectArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the file object.
 * 
 * @throws Throws an error if the file object does not exist.
 * @throws Throws an error if the user does not have read permission on the planet.
 */
async function fileObject(root: undefined, args: IFileObjectArgs, context: Context): Promise<IFileObject> {
  const fileObject = await FileObjects.findOne({_id: args.id});

  if (!fileObject || !await permissions.checkReadPermission(context.user?.id ?? null, fileObject.planet)) throw new NotFoundError();

  return fileObject;
}

/**
 * Arguments for {@link files} and {@link folders}.
 */
interface IFilesArgs {
  /* The ID of the file component to retrieve the files from. */
  componentId: string,
  /* The ID of the parent file object, or 'root'. */
  parent: string
}

/**
 * Gets all the files in a folder.
 * 
 * @param root Unused.
 * @param args The arguments to be used to get the files. See {@link IFilesArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the files.
 * 
 * @throws Throws an error if the user does not have read permission on the planet.
 * @throws Throws an error if the parent file object does not exist.
 */
async function files(root: undefined, args: IFilesArgs, context: Context): Promise<IFileObject[]> {
  const fileComponent = await Files.findOne({_id: args.componentId});

  if (!(fileComponent && await permissions.checkReadPermission(context.user?.id ?? null, fileComponent.planet))) throw new NotFoundError();

  const files = FileObjects.find({componentId: args.componentId, parent: args.parent, type: "file", finishedUploading: true}).sort({'name': 1});
  return files;
}

/**
 * Gets all the folders in a folder.
 * 
 * @param root Unused.
 * @param args The arguments to be used to get the folders. See {@link IFilesArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the folders.
 * 
 * @throws Throws an error if the user does not have read permission on the planet.
 * @throws Throws an error if the parent file object does not exist.
 */
async function folders(root: undefined, args: IFilesArgs, context: Context): Promise<IFileObject[]> {
  const fileComponent = await Files.findOne({_id: args.componentId});

  if (!(fileComponent && await permissions.checkReadPermission(context.user?.id ?? null, fileComponent.planet))) throw new NotFoundError();

  const folders = await FileObjects.find({componentId: args.componentId, parent: args.parent, type: "folder"}).sort({'name': 1});
  return folders; 
}

/**
 * Arguments for {@link createFolder}.
 */
interface ICreateFolderArgs {
  /* The ID of the file component to create the folder in. */
  componentId: string,
  /* The ID of the parent folder, or 'root'. */
  parent: string,
  /* The name of the folder. */
  name: string
}

/**
 * Creates a folder.
 * 
 * @param root Unused.
 * @param args The arguments to be used to create the folder. See {@link ICreateFolderArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the created folder.
 * 
 * @throws Throws an error if the user does not have full write permission on the planet.
 * @throws Throws an error if the parent folder does not exist.
 * @throws Throws an error if the parent file object is not a folder.
 * @throws Throws an error if the component does not exist.
 */
async function createFolder(root: undefined, args: ICreateFolderArgs, context: Context): Promise<IFileObject> {
  const component = await Files.findOne({_id: args.componentId});

  if(!component || !(await permissions.checkFullWritePermission(context.user?.id ?? null, component.planet))) throw new NotFoundError();

  let path = ["root"];
  if(args.parent != "root") {
    const parentObject = await FileObjects.findOne({_id: args.parent});
    if(!parentObject) throw new UserInputError("Parent not found");
    if (parentObject.type != "folder") throw new UserInputError("Parent is not a folder");
    path = parentObject.path;
    path.push(parentObject._id);
  }
  const fileObject = new FileObjects({
    path,
    parent: path[path.length - 1],
    name: args.name,
    planet: component.planet,
    owner: context.user.id,
    createdAt: new Date(),
    componentId: args.componentId,
    type: "folder",
    fileType: "starship/folder"
  });
  return fileObject.save();
}

/**
 * Arguments for {@link renameObject}.
 */
interface IRenameObjectArgs {
  /* The ID of the file object to rename. */
  objectId: string,
  /* The new name of the file object. */
  name: string
}

/**
 * Renames a file object.
 * 
 * @param root Unused.
 * @param args The arguments to be used to rename the file object. See {@link IRenameObjectArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the renamed file object.
 * 
 * @throws Throws an error if the user does not have full write permission on the planet.
 * @throws Throws an error if the file object does not exist.
 */
async function renameObject(root: undefined, args: IRenameObjectArgs, context: Context): Promise<IFileObject> {
  const object = await FileObjects.findOne({_id: args.objectId});

  if (!object || !await permissions.checkFullWritePermission(context.user?.id ?? null, object.planet)) throw new NotFoundError("Not found.");

  const name = args.name.replace(/[/\\?%*:|"<>]/g, "-");
  return FileObjects.findOneAndUpdate({_id: args.objectId}, {$set: {name}}, {new: true}); 
}

/**
 * Arguments for {@link moveObject}.
 */
interface IMoveObjectArgs {
  /* The IDs of the file objects to move. */
  objectIds: string[],
  /* The ID of the file component to move the objects to. */
  parent: string
}

/**
 * Moves an array of file objects to a new parent.
 * 
 * @param root Unused.
 * @param args The arguments to be used to move the file objects. See {@link IMoveObjectArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the moved file objects.
 * 
 * @throws Throws an error if the user does not have full write permission on the planet.
 * @throws Throws an error if the parent file object does not exist.
 * @throws Throws an error if the parent file object is not a folder.
 * @throws Throws an error if any of the file objects do not exist.
 * @throws Throws an error if moving the file objects across a component.
 * @throws Throws an error if moving the file objects would create a loop.
 */
async function moveObject(root: undefined, args: IMoveObjectArgs, context: Context): Promise<IFileObject[]> {
  const objects = await FileObjects.find({_id: {$in: args.objectIds}});
  const newParent = await FileObjects.findOne({_id: args.parent});
  
  if (!(objects && objects[0] && objects.length == args.objectIds.length)) throw new NotFoundError();
  if (!(context.user && await permissions.checkFullWritePermission(context.user.id, objects[0].planet))) throw new NotFoundError();
  if (!((newParent && newParent.type == "folder") || args.parent == "root")) throw new UserInputError("Invalid destination.");
  if (!((objects[0].componentId == newParent?.componentId || args.parent == "root") && objects.filter((file) => file.componentId == objects[0].componentId).length == objects.length)) throw new UserInputError("Cannot move across components.");
  if (!(args.parent == "root" || !args.objectIds.includes(newParent._id))) throw new UserInputError("Cannot move an object into itself.");

  const updatedObjects: IFileObject[] = [];
  for(const object of objects) {
    if(object.type == "file") {
      // Update the file path
      const newPath = newParent ? newParent.path.concat([newParent._id]) : ["root"];
      const newObjectParent = newParent ? newParent._id : "root";
      updatedObjects.push(await FileObjects.findOneAndUpdate({_id: object._id}, {$set: {path: newPath as [string], parent: newObjectParent}}, {new: true}));
    } else if(object.type == "folder") {
      // Get the new path
      const newPath = newParent ? newParent.path.concat([newParent._id]) : ["root"];
      const newObjectParent = newParent ? newParent._id : "root";
      // Pull the old path objects
      await FileObjects.updateMany({path: object._id}, {$pull: {path: {$in: object.path}}}, {multi: true});
      // Push in the new path
      await FileObjects.updateMany({path: object._id}, {$push: {path: {$each: newPath, $position: 0}}}, {multi: true});
      // Update the parent
      updatedObjects.push(await FileObjects.findOneAndUpdate({_id: object._id}, {$set: {path: newPath as [string], parent: newObjectParent}}, {new: true}));
    }
  }
  return updatedObjects;
}

/**
 * Arguments for {@link fileObjectArray}.
 */
interface IFileObjectArrayArgs {
  /* The IDs of the file objects to retrieve. */
  ids: string[]
}

/**
 * Gets an array of file objects.
 * 
 * @param root Unused.
 * @param args The arguments to be used to get the file objects. See {@link IFileObjectArrayArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the array of file objects.
 * 
 * @throws Throws an error if the user does not have read permission on the planet.
 * @throws Throws an error if any of the file objects do not exist.
 * @throws Throws an error if any of the file objects are not in the same planet.
 */
async function fileObjectArray(root: undefined, args: IFileObjectArrayArgs, context: Context): Promise<IFileObject[]> {
  const objects = await FileObjects.find({_id: {$in: args.ids}});

  if(!objects[0]) throw new NotFoundError();
  if(!(context.user && await permissions.checkReadPermission(context.user.id, objects[0].planet))) throw new NotFoundError();
  if(objects.filter(object => object.planet == objects[0].planet).length != objects.length) throw new UserInputError("Cannot get file objects from different planets.");

  return objects;
}

/**
 * Arguments for {@link searchForFiles}.
 */
interface ISearchForFilesArgs {
  /* The component to search in. */
  componentId: string,
  /* The parent folder to search in. */
  parent: string,
  /* The search query. */
  searchText: string
}

/**
 * Searches for files in a component.
 * 
 * @param root Unused.
 * @param args The arguments to be used to search for the files. See {@link ISearchForFilesArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the array of file objects.
 * 
 * @throws Throws an error if the user does not have read permission on the planet.
 * @throws Throws an error if the component does not exist.
 * @throws Throws an error if the parent folder does not exist.
 * @throws Throws an error if the search text is not at least 3 characters long.
 */
async function searchForFiles(root: undefined, args: ISearchForFilesArgs, context: Context): Promise<IFileObject[]> {
  const component = await Files.findOne({_id: args.componentId});
  const parent = await FileObjects.findOne({_id: args.parent});

  if (!(component && await permissions.checkReadPermission(context.user?.id ?? null, component.planet))) throw new NotFoundError();
  if (!(parent && parent.type == "folder") && args.parent != "root") throw new UserInputError("Invalid parent.");
  if (!(args.searchText.length >= 3)) throw new UserInputError("Search text must be at least 3 characters long.");

  return FileObjects.find({path: args.parent, componentId: args.componentId, $text: {$search: args.searchText}}).sort({score: {$meta: "textScore"}});
}

/**
 * Arguments for {@link cancelUpload}.
 */
interface ICancelUploadArgs {
  /* The ID of the file object to cancel. */
  objectId: string
}

/**
 * Cancels an upload.
 * 
 * @param root Unused.
 * @param args The arguments to be used to cancel the upload. See {@link ICancelUploadArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to true if the upload was successfully cancelled.
 * 
 * @throws Throws an error if the user is not logged in.
 * @throws throws an error if the user does not own the file object.
 * @throws Throws an error if the file object has finished uploading.
 */
async function cancelUpload(root: undefined, args: ICancelUploadArgs, context: Context): Promise<boolean> {
  const fileObject = await FileObjects.findOne({_id: args.objectId});
  
  if (!fileObject && context.user?.id != fileObject.owner) throw new NotFoundError();
  if (fileObject.finishedUploading) throw new UserInputError("Cannot cancel an upload that has finished uploading.");

  await FileObjects.deleteOne({_id: fileObject._id});
  return true;
}

/**
 * Arguments for {@link createMultiObjectDownloadTicket}.
 */
interface ICreateMultiObjectDownloadTicketArgs {
  /** The IDs of the file objects to create a ticket for. */
  objectIds: string[]
  /** The name of the ZIP. */
  zipName: string
}

/**
 * Generates a multi-object download ticket to be used with the HTTP endpoint.
 * 
 * @param root Unused.
 * @param args The arguments to be used to create the ticket. See {@link ICreateMultiObjectDownloadTicketArgs}
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the token's ID.
 *
 * @throws Throws an error if the user does not have read permission on the planet.
 * @throws Throws an error if any of the file objects do not exist.
 * @throws Throws an error if any of the file objects are not in the same planet.
 * @throws Throws an error if more than 100 file objects are being downloaded.
 * 
 */
async function createMultiObjectDownloadTicket(root: undefined, args: ICreateMultiObjectDownloadTicketArgs, context: Context): Promise<string> {
  if (args.objectIds.length > 100) throw new UserInputError("Cannot download more than 100 files at once.");
  
  const objects = await FileObjects.find({_id: {$in: args.objectIds}});

  if (!objects[0] || objects.length != args.objectIds.length) throw new NotFoundError();
  if (!(await permissions.checkReadPermission(context.user.id, objects[0].planet))) throw new NotFoundError();
  if (objects.filter(object => object.planet == objects[0].planet).length != objects.length) throw new UserInputError("Cannot get file objects from different planets.");

  const ticket = new MultiObjectTickets({
    name: args.zipName,
    objects: args.objectIds
  });

  await ticket.save();

  return ticket._id;
}

export default {fieldResolvers, createMultiObjectDownloadTicket, cancelUpload, searchForFiles, fileObjectArray, fileObject, files, folders, createFolder, renameObject, moveObject};
