import Users, { IUser, safeUserFields } from "../../database/Users";

export default async function userLoader(ids: string[]) : Promise<IUser[]> {
  const objects = await Users.find({_id: {$in: ids}}).select(safeUserFields);

  return ids.map((id) => objects.find((object) => object._id === id));
}