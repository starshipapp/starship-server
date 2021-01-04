import { IForumReply } from "../../database/components/forum/ForumReplies";

/* eslint-disable semi */
export default interface IForumReplyFeed {
  cursor: string,
  forumReplies: IForumReply[];
}