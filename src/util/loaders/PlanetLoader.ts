import Planets, { IPlanet } from "../../database/Planets";

export default async function planetLoader(ids: string[]) : Promise<IPlanet[]> {
  const objects = await Planets.find({_id: {$in: ids}});

  return ids.map((id) => objects.find((object) => object._id === id));
}