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
    const fileComponent = await Files.findOne({_id: fileObject.componentId});
    if(fileComponent && await permissions.checkReadPermission(context.user.id, fileComponent.id)) {
      return fileObject;
    } else {
      throw new Error("Not found.");
    }
  } else {
    throw new Error("Not found.");
  }
}

export default {fieldResolvers, fileObject};