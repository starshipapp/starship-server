import { IForumPost } from "../../database/components/forum/ForumPosts";

/* eslint-disable semi */
export default interface IForumPostFeed {
  cursor: string,
  forumPosts: IForumPost[];
}