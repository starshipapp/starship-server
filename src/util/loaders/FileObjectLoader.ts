import FileObjects, { IFileObject } from "../../database/components/files/FileObjects";

export default async function fileObjectLoader(ids: string[]) : Promise<IFileObject[]> {
  const objects = await FileObjects.find({_id: {$in: ids}});
  
  return ids.map((id) => objects.find((object) => object._id === id));
}