import FileObjects, { IFileObject } from "../../database/components/files/FileObjects";

export default async function fileObjectLoader(ids: string[]) : Promise<IFileObject[]> {
  return await FileObjects.find({_id: {$in: ids}});
}