/**
 * Object representing the sort value to be passed to mongo's sort() method.
 */
export type SortType = {
  createdAt?: 1 | -1,
  updatedAt?: 1 | -1,
  replyCount?: 1 | -1;
}

/**
 * A record of the valid sort types and their corresponding sort functions.
 */
export const forumSortTypes: Record<string, SortType> = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  recentlyUpdated: { updatedAt: -1 },
  leastRecentlyUpdated: { updatedAt: 1 },
  mostReplies: { replyCount: -1 },
  fewestReplies: { replyCount: 1 }
};
