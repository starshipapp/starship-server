import Users, { IUser, safeUserFields } from "../../database/Users";

export default async function userLoader(ids: string[]) : Promise<IUser[]> {
  return await Users.find({_id: {$in: ids}}).select(safeUserFields);
}