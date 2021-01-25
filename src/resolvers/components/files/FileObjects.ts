import e from "express";
import FileObjects, { IFileObject } from "../../../database/components/files/FileObjects";
import Files, { IFiles } from "../../../database/components/files/Files";
import { IPlanet } from "../../../database/Planets";
import { IUser } from "../../../database/Users";
import Context from "../../../util/Context";
import permissions from "../../../util/permissions";

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

interface IFileObjectArgs {
  id: string
}

async function fileObject(root: undefined, args: IFileObjectArgs, context: Context): Promise<IFileObject> {
  const fileObject = await FileObjects.findOne({_id: args.id});
  if(fileObject) {
    if(await permissions.checkReadPermission(context.user.id, fileObject.planet)) {
      return fileObject;
    } else {
      throw new Error("Not found.");
    }
  } else {
    throw new Error("Not found.");
  }
}

interface IFilesArgs {
  componentId: string,
  parent: string
}

async function files(root: undefined, args: IFilesArgs, context: Context): Promise<IFileObject[]> {
  const fileComponent = await Files.findOne({_id: args.componentId});
  if(fileComponent && await permissions.checkReadPermission(context.user.id, fileComponent.id)) {
    return FileObjects.find({componentId: args.componentId, parent: args.parent, type: "file", finishedUploading: true});
  } else {
    throw new Error("Not found.");
  }
}

async function folders(root: undefined, args: IFilesArgs, context: Context): Promise<IFileObject[]> {
  const fileComponent = await Files.findOne({_id: args.componentId});
  if(fileComponent && await permissions.checkReadPermission(context.user.id, fileComponent.id)) {
    return FileObjects.find({componentId: args.componentId, parent: args.parent, type: "folder"});
  } else {
    throw new Error("Not found.");
  }
}

interface ICreateFolderArgs {
  componentId: string,
  parent: string,
  name: string
}

async function createFolder(root: undefined, args: ICreateFolderArgs, context: Context): Promise<IFileObject> {
  if(context.user) {
    const component = await Files.findOne({_id: args.componentId});
    if(component && await permissions.checkFullWritePermission(context.user.id, component.planet)) {
      let path = ["root"];
      if(args.parent != root) {
        const parentObject = await FileObjects.findOne({_id: args.parent});
        if(!parentObject) {
          throw new Error("Parent not found");
        }
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
    } else {
      throw new Error("Component not found.");
    }
  } else {
    throw new Error("Not logged in.");
  }
}

interface ICompleteUploadArgs {
  objectId: string
}

async function completeUpload(root: undefined, args: ICompleteUploadArgs, context: Context): Promise<IFileObject> {
  if(context.user) {
    const fileObject = await FileObjects.findOne({_id: args.objectId});
    if(fileObject && fileObject.owner == context.user.id) {
      return FileObjects.findOneAndUpdate({_id: args.objectId}, {$set: {finishedUploading: true}}, {new: true});
    } else {
      throw new Error("Not found.");
    }
  } else {
    throw new Error("Not logged in.");
  }
}

interface IRenameObjectArgs {
  objectId: string,
  name: string
}

async function renameObject(root: undefined, args: IRenameObjectArgs, context: Context): Promise<IFileObject> {
  const object = await FileObjects.findOne({id: args.objectId});
  if(context.user && await permissions.checkFullWritePermission(context.user.id, object.planet)) {
    const name = args.name.replace(/[/\\?%*:|"<>]/g, "-");
    return FileObjects.findOneAndUpdate({_id: args.objectId}, {$set: {name}}, {new: true});
  } else {
    throw new Error("Not found.");
  }
}

interface IMoveObjectArgs {
  objectId: string,
  parent: string
}

async function moveObject(root: undefined, args: IMoveObjectArgs, context: Context): Promise<IFileObject> {
  const object = await FileObjects.findOne({_id: args.objectId});
  const newParent = await FileObjects.findOne({_id: args.parent});
  if(object)  {
    if(context.user && await permissions.checkFullWritePermission(context.user.id, object.planet)) {
      if((newParent && newParent.type == "folder") || args.parent == "root") {
        if(object.componentId == newParent.componentId) {
          if(object.type == "file") {
            const newPath = newParent ? newParent.path.concat([newParent._id]) : ["root"];
            const newObjectParent = newParent ? newParent._id : "root";
            return FileObjects.findOneAndUpdate({_id: args.objectId}, {$set: {path: newPath as [string], parent: newObjectParent}});
          } else if(object.type == "folder") {
            const newPath = newParent ? newParent.path.concat([newParent._id]) : ["root"];
            const newObjectParent = newParent ? newParent._id : "root";
            await FileObjects.updateMany({path: object._id}, {$pull: {path: {$in: object.path}}}, {multi: true});
            await FileObjects.updateMany({path: object._id}, {$push: {path: {$each: newPath, $position: 0}}}, {multi: true});
            return FileObjects.findOneAndUpdate({_id: object._id}, {$set: {path: newPath as [string], parent: newObjectParent}});
          }
        } else {
          throw new Error ("Cannot move across components.");
        }
      } else {
        throw new Error ("Invalid destination.");
      }
    } else {
      throw new Error("Not found.");
    }
  } else {
    throw new Error("Not found.");
  }
}

interface IFileObjectArrayArgs {
  ids: string[]
}

async function fileObjectArray(root: undefined, args: IFileObjectArrayArgs, context: Context): Promise<IFileObject[]> {
  const objects = await FileObjects.find({_id: {$in: args.ids}});
  if(objects[0]) {
    if(context.user && await permissions.checkReadPermission(context.user.id, objects[0].planet)) {
      if(objects.filter(object => object.planet == objects[0].planet)) {
        return objects;
      } else {
        throw new Error ("All files must be from the same planet.");
      }
    } else {
      throw new Error("No objects found.");
    }
  } else {
    throw new Error("No objects found.");
  }
}

export default {fieldResolvers, fileObjectArray, fileObject, files, folders, createFolder, completeUpload, renameObject, moveObject};