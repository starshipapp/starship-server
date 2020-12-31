import Forums, { IForum } from "../../database/components/forum/Forums";

export default async function forumLoader(ids: string[]) : Promise<IForum[]> {
  return await Forums.find({_id: {$in: ids}});
}