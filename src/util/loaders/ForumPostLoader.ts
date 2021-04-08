import ForumPosts, { IForumPost } from "../../database/components/forum/ForumPosts";

export default async function forumPostLoader(ids: string[]) : Promise<IForumPost[]> {
  const objects = await ForumPosts.find({_id: {$in: ids}});

  return ids.map((id) => objects.find((object) => object._id === id));
}