import Forums, { IForum } from "../../database/components/forum/Forums";

export default async function forumLoader(ids: string[]) : Promise<IForum[]> {
  const objects = await Forums.find({_id: {$in: ids}});
  
  return ids.map((id) => objects.find((object) => object._id === id));
}