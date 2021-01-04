import ForumPosts, { IForumPost } from "../../database/components/forum/ForumPosts";

export default async function forumPostLoader(ids: string[]) : Promise<IForumPost[]> {
  return await ForumPosts.find({_id: {$in: ids}});
}