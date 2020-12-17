export type SortType = {
  createdAt?: number,
  updatedAt?: number,
  replyCount?: number
}

export const forumSortTypes: Record<string, SortType> = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  recentlyUpdated: { updatedAt: -1 },
  leastRecentlyUpdated: { updatedAt: 1 },
  mostReplies: { replyCount: -1 },
  fewestReplies: { replyCount: 1 }
};