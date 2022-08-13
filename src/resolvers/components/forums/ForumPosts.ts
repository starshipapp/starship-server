import ForumPosts, { IForumPost } from "../../../database/components/forum/ForumPosts";
import ForumReplies from "../../../database/components/forum/ForumReplies";
import Forums, { IForum } from "../../../database/components/forum/Forums";
import Planets, { IPlanet } from "../../../database/Planets";
import Users, { IUser } from "../../../database/Users";
import Context from "../../../util/Context";
import permissions from "../../../util/permissions";
import emoji from "node-emoji";
import IForumReplyFeed from "../../../util/feeds/IForumReplyFeed";
import CustomEmojis from "../../../database/CustomEmojis";
import getMentions from "../../../util/getMentions";
import { NotFoundError } from "../../../util/NotFoundError";
import { UserInputError } from "apollo-server-errors";

/**
 * Arguments for {@link fieldResolvers.replies}
 */
interface IReplyResolverArgs {
  /* The amount of replies to retrieve. */
  limit?: number,
  /* The amount of replies to skip. */
  cursor?: string
}

/**
 * Resolvers for the fields of the GraphQL type.
 */
const fieldResolvers = {
  component: async (root: IForumPost, args: undefined, context: Context): Promise<IForum> => {
    return context.loaders.forumLoader.load(root.componentId);
  },
  owner: async (root: IForumPost, args: undefined, context: Context): Promise<IUser> => {
    return context.loaders.userLoader.load(root.owner);
  },
  planet: async (root: IForumPost, args: undefined, context: Context): Promise<IPlanet> => {
    return context.loaders.planetLoader.load(root.planet);
  },
  /**
   * Fetches the replies of a forum post.
   * 
   * @param root The root post of the query.
   * @param args The arguments for the query. See {@link IReplyResolverArgs}.
   * 
   * @returns A promise that resolves to a forum reply feed.
   */
  replies: async (root: IForumPost, args: IReplyResolverArgs): Promise<IForumReplyFeed> => {
    let limit = args.limit ?? 25;

    if(limit > 25) {
      limit = 25;
    }
    
    const documents = await ForumReplies.find({postId: root._id}).sort({ createdAt: 1 }).skip(Number(args.cursor ?? 0)).limit(limit);

    return {
      forumReplies: documents,
      cursor: String(Number(args.cursor ?? 0) + documents.length)
    };
  },
  mentions: async (root: IForumPost, args: undefined, context: Context): Promise<IUser[]> => {
    const loaded = await context.loaders.userLoader.loadMany(root.mentions);
    return loaded as IUser[];
  }
};

/**
 * Arguments for {@link forumPost}.
 */
interface IForumPostArgs {
  /* The ID of the forum post to retrieve. */
  id: string
}

/**
 * Gets a forum post.
 * 
 * @param root Unused.
 * @param args The arguments to be used to get the forum post. See {@link IForumPostArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the forum post.
 * 
 * @throws Throws an error if the forum post is not found.
 * @throws Throws an error if the user does not have read permission on the planet.
 */
async function forumPost(root: undefined, args: IForumPostArgs, context: Context): Promise<IForumPost> {
  const forumpost = await ForumPosts.findOne({_id: args.id});
  
  if(!forumpost) throw new NotFoundError();
  if(!(await permissions.checkReadPermission(context.user?.id ?? null, forumpost.planet))) throw new NotFoundError();
  
  return forumpost; 
}

/**
 * Arguments for {@link insertForumPost}.
 */
interface IInsertForumPostArgs {
  /* The ID of the forum to insert the post into. */
  forumId: string
  /* The name of the post. */
  name: string
  /* The content of the post. */
  content: string
  /* The tag to add to the post. */
  tag?: string
}

/**
 * Creates a new forum post.
 * 
 * @param root Unused.
 * @param args The arguments to be used to create the forum post. See {@link IInsertForumPostArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the created forum post.
 * 
 * @throws Throws an error if the user does not have public write permission on the planet.
 */
async function insertForumPost(root: undefined, args: IInsertForumPostArgs, context: Context): Promise<IForumPost> {
  const forum = await Forums.findOne({_id: args.forumId});

  if(!forum) throw new NotFoundError();
  if(!context.user || !(await permissions.checkPublicWritePermission(context.user.id, forum.planet))) throw new NotFoundError();

  const tags: string[] = [];

  if(args.tag && args.tag != "" && forum.tags && forum.tags.includes(args.tag)) {
    tags.push(args.tag);
  }

  const forumPost = new ForumPosts({
    name: args.name,
    componentId: args.forumId,
    content: args.content,
    owner: context.user.id,
    planet: forum.planet,
    tags,
    reactions: [],
    replyCount: 0,
    stickied: false,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  await forumPost.save();

  const user = await Users.findOne({_id: context.user.id});
  const planet = await Planets.findOne({_id: forum.planet});

  return ForumPosts.findOneAndUpdate({_id: forumPost._id}, {$set: {mentions: await getMentions(args.content, user, `the forum thread [${forumPost.name}](${process.env.SITE_URL}/planet/${forum.planet}/${forum._id}/${forumPost._id})`, planet)}}, {new: true});
}

/**
 * Arguments for {@link updateForumPost}.
 */
interface IUpdateForumPost {
  /* The ID of the forum post to update. */
  postId: string,
  /* The name of the post. */
  content: string
}

/**
 * Updates a forum post.
 * 
 * @param root Unused.
 * @param args The arguments to be used to update the forum post. See {@link IUpdateForumPost}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the updated forum post.
 * 
 * @throws Throws an error if the post is not found.
 * @throws Throws an error if the user does not have full write permission on the planet and does not own the post.
 */
async function updateForumPost(root: undefined, args: IUpdateForumPost, context: Context): Promise<IForumPost> {
  const post = await ForumPosts.findOne({_id: args.postId});

  if(!post) throw new NotFoundError();
  if(!context.user || (!(await permissions.checkFullWritePermission(context.user.id, post.planet)) && post.owner != context.user.id)) throw new NotFoundError();

  return ForumPosts.findOneAndUpdate({_id: args.postId}, {$set: {content: args.content}}, {new: true}); 
}

/**
 * Arguments for {@link deleteForumPost}, {@link lockForumPost} and {@link stickyForumPost}.
 */
interface IGenericForumPostArgs {
  /* The ID of the forum post to use. */
  postId: string
}

/**
 * Deletes a forum post.
 * 
 * @param root Unused.
 * @param args The arguments to be used to delete the forum post. See {@link IGenericForumPostArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to true if the post was deleted.
 * 
 * @throws Throws an error if the post is not found.
 * @throws Throws an error if the user does not have full write permission on the planet and does not own the post.
 */
async function deleteForumPost(root: undefined, args: IGenericForumPostArgs, context: Context): Promise<boolean> {
  const post = await ForumPosts.findOne({_id: args.postId});

  if(!post) throw new NotFoundError();
  if(!context.user || (!(await permissions.checkFullWritePermission(context.user.id, post.planet)) && post.owner != context.user.id)) throw new NotFoundError();

  await ForumPosts.deleteOne({_id: args.postId});
  await ForumReplies.deleteMany({postId: args.postId});
  return true;
}

/**
 * Locks a forum post.
 * 
 * @param root Unused.
 * @param args The arguments to be used to lock the forum post. See {@link IGenericForumPostArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the locked forum post.
 * 
 * @throws Throws an error if the post is not found.
 * @throws Throws an error if the user does not have full write permission on the planet.
 */
async function lockForumPost(root: undefined, args: IGenericForumPostArgs, context: Context): Promise<IForumPost> {
  const post = await ForumPosts.findOne({_id: args.postId});

  if(!post) throw new NotFoundError();
  if(!context.user || !(await permissions.checkFullWritePermission(context.user.id, post.planet))) throw new NotFoundError();

  return ForumPosts.findOneAndUpdate({_id: args.postId}, {$set: {locked: !post.locked}}, {new: true}); 
}

/**
 * Sticky a forum post.
 * 
 * @param root Unused.
 * @param args The arguments to be used to sticky the forum post. See {@link IGenericForumPostArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the sticky forum post.
 * 
 * @throws Throws an error if the post is not found.
 * @throws Throws an error if the user does not have full write permission on the planet.
 */
async function stickyForumPost(root: undefined, args: IGenericForumPostArgs, context: Context): Promise<IForumPost> {
  const post = await ForumPosts.findOne({_id: args.postId});

  if(!post) throw new NotFoundError();
  if(!context.user || !(await permissions.checkFullWritePermission(context.user.id, post.planet))) throw new NotFoundError();

  return ForumPosts.findOneAndUpdate({_id: args.postId}, {$set: {stickied: !post.stickied}}, {new: true});
}

/**
 * Arguments for {@link forumPostReact}.
 */
interface IForumPostReactArgs {
  /* The ID of the forum post to react to. */
  postId: string,
  /* The reaction to use. */
  emojiId: string
}

/**
 * Reacts to a forum post.
 * 
 * @param root Unused.
 * @param args The arguments to be used to react to the forum post. See {@link IForumPostReactArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the forum post.
 * 
 * @throws Throws an error if the user does not have public write permission on the planet.
 * @throws Throws an error if the reply is not found.
 * @throws Throws an error if the custom emoji is not found.
 */
async function forumPostReact(root: undefined, args: IForumPostReactArgs, context: Context): Promise<IForumPost> {
  const post = await ForumPosts.findOne({_id: args.postId});

  if(!post) throw new NotFoundError();
  if(!context.user || !(await permissions.checkPublicWritePermission(context.user.id, post.planet))) throw new NotFoundError();
  if(!emoji.hasEmoji(args.emojiId) && !args.emojiId.startsWith("ceid:")) throw new UserInputError("Invalid emoji.");

  const reaction = post.reactions.find(value => value.emoji === args.emojiId);
  if(reaction) {
    if(reaction.reactors.includes(context.user.id)) {
      if(reaction.reactors.length === 1) {
        return ForumPosts.findOneAndUpdate({_id: args.postId}, {$pull: {reactions: reaction}}, {new: true});
      } else {
        return ForumPosts.findOneAndUpdate({_id: args.postId, reactions: {$elemMatch: {emoji: args.emojiId}}}, {$pull: {"reactions.$.reactors": context.user.id}}, {new: true});
      }
    } else {
      return ForumPosts.findOneAndUpdate({_id: args.postId, reactions: {$elemMatch: {emoji: args.emojiId}}}, {$push: {"reactions.$.reactors": context.user.id}}, {new: true});
    }
  } else {
    // format for custom emojis is ceid:id
    if(args.emojiId.startsWith("ceid:")) {
      const emoji = args.emojiId.split(":");
      const emojiObject = await CustomEmojis.findOne({_id: emoji[1]});
      if(!emojiObject) {
        throw new UserInputError("Invalid custom emoji.");
      }
    }
    return ForumPosts.findOneAndUpdate({_id: args.postId}, {$push: {reactions: {emoji: args.emojiId, reactors: [context.user.id]}}}, {new: true});
  }
}


export default {fieldResolvers, forumPost, insertForumPost, updateForumPost, deleteForumPost, lockForumPost, stickyForumPost, forumPostReact};
