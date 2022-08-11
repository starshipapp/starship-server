import { FilterQuery } from "mongoose";
import ForumPosts, { IForumPost } from "../../../database/components/forum/ForumPosts";
import Forums, { IForum } from "../../../database/components/forum/Forums";
import { IPlanet } from "../../../database/Planets";
import { IUser } from "../../../database/Users";
import Context from "../../../util/Context";
import IForumPostFeed from "../../../util/feeds/IForumPostFeed";
import permissions from "../../../util/permissions";
import { forumSortTypes } from "../../../util/sortTypes";

/**
 * Arguments for {@link fieldResolvers.posts}.
 */
interface IPostResolverArgs {
  /** The amount of posts to retrieve. */
  limit?: number,
  /** The offset of the posts to retrieve. */
  cursor?: string,
  /** The sort type of the posts. */
  sortMethod?: string,
  /** The required post tag. */
  tag?: string
}

/**
 * Resolvers for the fields of the GraphQL type.
 */
const fieldResolvers = {
  owner: async (root: IForum, args: undefined, context: Context): Promise<IUser> => {
    return context.loaders.userLoader.load(root.owner);
  },
  planet: async (root: IForum, args: undefined, context: Context): Promise<IPlanet> => {
    return context.loaders.planetLoader.load(root.planet);
  },
  stickiedPosts: async (root: IForum): Promise<IForumPost[]> => {
    return ForumPosts.find({componentId: root._id, stickied: true});
  },
  /**
   * Fetches the posts for a forum.
   * 
   * @param root The root forum object of the query.
   * @param args The arguments for the query. See {@link IPostResolverArgs}.
   * 
   * @returns A promise that resolves to a forum post feed.
   */
  posts: async (root: IForum, args: IPostResolverArgs): Promise<IForumPostFeed> => {
    let limit = args.limit ?? 25;
    let sortMethod = forumSortTypes.recentlyUpdated;
    
    if(limit > 25) {
      limit = 25;
    }

    if(args.sortMethod && Object.keys(forumSortTypes).includes(args.sortMethod)) {
      sortMethod = forumSortTypes[args.sortMethod];
    } else if(args.sortMethod) {
      throw new Error(`Invalid sort method '${args.sortMethod}'`);
    }

    const findObject: FilterQuery<IForumPost> = {componentId: root._id, stickied: false};

    if(args.tag) {
      findObject.tags = [args.tag];
    }

    // interpret cursor
    if(args.cursor) {
      const cursor = Number(args.cursor);
      if(!cursor) {
        throw new Error("Invalid cursor.");
      }
      if(sortMethod == forumSortTypes.newest) {
        const date = new Date(cursor);
        findObject.createdAt = {$lt: date};
      } else if (sortMethod == forumSortTypes.oldest) {
        const date = new Date(cursor);
        findObject.createdAt = {$gt: date};
      } else if (sortMethod == forumSortTypes.recentlyUpdated) {
        const date = new Date(cursor);
        findObject.updatedAt = {$lt: date};
      } else if (sortMethod == forumSortTypes.leastRecentlyUpdated) {
        const date = new Date(cursor);
        findObject.updatedAt = {$gt: date};
      } else if (sortMethod == forumSortTypes.mostReplies) {
        findObject.replyCount = {$lt: cursor};
      } else if (sortMethod == forumSortTypes.fewestReplies) {
        findObject.replyCount = {$gt: cursor};
      }
    }
    
    const documents = await ForumPosts.find(findObject).sort(sortMethod).limit(limit);

    // handle empty document array
    if(documents.length == 0) {
      return {
        forumPosts: [],
        cursor: args.cursor ?? ""
      };
    }

    const cursoryDocument = documents[documents.length - 1];
    let cursor = "";

    // determine returned cursor
    if(sortMethod == forumSortTypes.newest || forumSortTypes.oldest) {
      cursor = String(cursoryDocument.createdAt.getTime());
    } else if (sortMethod == forumSortTypes.recentlyUpdated || sortMethod == forumSortTypes.leastRecentlyUpdated) {
      cursor = String(cursoryDocument.updatedAt.getTime());
    } else if (sortMethod == forumSortTypes.mostReplies || sortMethod == forumSortTypes.fewestReplies) {
      cursor = String(cursoryDocument.replyCount);
    }

    return {
      forumPosts: documents,
      cursor
    };
  }
};


/**
 * Arguments for {@link forum}.
 */
interface IForumArgs {
  /** The ID of the forum to retrieve. */
  id: string
}

/**
 * Gets a forum component.
 * 
 * @param root Unused.
 * @param args The arguments to be used to get the forum. See {@link IForumArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the forum.
 * 
 * @throws Throws an error if the forum is not found.
 * @throws Throws an error if the user does not have read permission on the planet.
 */
async function forum(root: undefined, args: IForumArgs, context: Context): Promise<IForum> {
  const forum = await Forums.findOne({_id: args.id});
  if(forum != undefined) {
    if(await permissions.checkReadPermission(context.user?.id ?? null, forum.planet)) {
      return forum;
    } else {
      throw new Error("Not found.");
    }
  } else {
    throw new Error("Not found.");
  }
}

/**
 * Arguments for {@link createForumTag} and {@link removeForumTag}.
 */
interface IForumTagArgs {
  /** The ID of the forum to update. */
  forumId: string,
  /** The tag to add/remove to the forum. */
  tag: string
}

/**
 * Adds a tag to a forum.
 * 
 * @param root Unused.
 * @param args The arguments to be used to add the tag. See {@link IForumTagArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the updated forum.
 * 
 * @throws Throws an error if the forum is not found.
 * @throws Throws an error if the user does not have full write permission on the planet.
 * @throws Throws an error if the tag is already in the forum.
 */
async function createForumTag(root: undefined, args: IForumTagArgs, context: Context): Promise<IForum> {
  const forum = await Forums.findOne({_id: args.forumId});
  if(forum != undefined) {
    if(context.user && context.user.id && await permissions.checkFullWritePermission(context.user.id, forum.planet)) {
      if((forum.tags && !forum.tags.includes(args.tag)) || !forum.tags) {
        return Forums.findOneAndUpdate({_id: args.forumId}, {$push: {tags: args.tag}}, {new: true});
      } else {
        throw new Error("Tag already exists!");
      }
    } else {
      throw new Error("Not found.");
    }
  } else {
    throw new Error("Not found.");
  }
}

/**
 * Removes a tag from a forum.
 * 
 * @param root Unused.
 * @param args The arguments to be used to remove the tag. See {@link IForumTagArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the updated forum.
 * 
 * @throws Throws an error if the forum is not found.
 * @throws Throws an error if the user does not have full write permission on the planet.
 */
async function removeForumTag(root: undefined, args: IForumTagArgs, context: Context): Promise<IForum> {
  const forum = await Forums.findOne({_id: args.forumId});
  if(forum != undefined) {
    if(context.user && context.user.id && await permissions.checkFullWritePermission(context.user.id, forum.planet)) {
      return Forums.findOneAndUpdate({_id: args.forumId}, {$pull: {tags: args.tag}}, {new: true});
    } else {
      throw new Error("Not found.");
    }
  } else {
    throw new Error("Not found.");
  }
}

export default {fieldResolvers, forum, createForumTag, removeForumTag};
