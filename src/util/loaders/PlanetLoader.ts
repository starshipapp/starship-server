import Planets, { IPlanet } from "../../database/Planets";

export default async function planetLoader(ids: string[]) : Promise<IPlanet[]> {
  return await Planets.find({_id: {$in: ids}});
}