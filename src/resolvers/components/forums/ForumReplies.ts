import ForumPosts, { IForumPost } from "../../../database/components/forum/ForumPosts";
import ForumReplies, { IForumReply } from "../../../database/components/forum/ForumReplies";
import { IForum } from "../../../database/components/forum/Forums";
import Planets, { IPlanet } from "../../../database/Planets";
import Users, { IUser } from "../../../database/Users";
import Context from "../../../util/Context";
import permissions from "../../../util/permissions";
import emoji from "node-emoji";
import CustomEmojis from "../../../database/CustomEmojis";
import getMentions from "../../../util/getMentions";

/**
 * Resolvers for the fields of the GraphQL type.
 */
const fieldResolvers = {
  component: async (root: IForumReply, args: undefined, context: Context): Promise<IForum> => {
    return context.loaders.forumLoader.load(root.componentId);
  },
  owner: async (root: IForumReply, args: undefined, context: Context): Promise<IUser> => {
    return context.loaders.userLoader.load(root.owner);
  },
  planet: async (root: IForumReply, args: undefined, context: Context): Promise<IPlanet> => {
    return context.loaders.planetLoader.load(root.planet);
  },
  post: async (root: IForumReply, args: undefined, context: Context): Promise<IForumPost> => {
    return context.loaders.forumPostLoader.load(root.postId);
  },
  mentions: async (root: IForumReply, args: undefined, context: Context): Promise<IUser[]> => {
    const loaded = await context.loaders.userLoader.loadMany(root.mentions);
    return loaded as IUser[];
  }
};

/**
 * Arguments for {@link forumReply}.
 */
interface IForumReplyArgs {
  /** The ID of the forum reply to retrieve. */
  id: string
}

/**
 * Get a forum reply.
 * 
 * @param root Unused.
 * @param args The arguments to be used to retrieve the forum reply. See {@link IForumReplyArgs}.
 * @param context The current user context for the request.
 * 
 * @return A promise resolving to the forum reply.
 * 
 * @throws Throws an error if the reply is not found.
 * @throws Throws an error if the user does not have read permission on the planet.
 */
async function forumReply(root: undefined, args: IForumReplyArgs, context: Context): Promise<IForumReply> {
  const forumReply = await ForumReplies.findOne({_id: args.id});
  if(forumReply) {
    if(await permissions.checkReadPermission(context.user?.id ?? null, forumReply.planet)) {
      return forumReply;
    } else {
      throw new Error("Not found.");
    }
  } else {
    throw new Error("Not found.");
  }
}

/**
 * Arguments for {@link insertForumReply}.
 */
interface IInsertForumReplyArgs {
  /** The ID of the fourm post to reply to. */
  postId: string,
  /** The content of the forum reply. */
  content: string,
}

/**
 * Creates a new forum reply.
 * 
 * @param root Unused.
 * @param args The arguments to be used to insert the forum reply. See {@link IInsertForumReplyArgs}.
 * @param context The current user context for the request.
 * 
 * @return A promise resolving to the new forum reply.
 * 
 * @throws Throws an error if the user does not have public write permission on the planet.
 * @throws Throws an error if the post is not found.
 */
async function insertForumReply(root: undefined, args: IInsertForumReplyArgs, context: Context): Promise<IForumReply> {
  const post = await ForumPosts.findOne({_id: args.postId});
  if(post && context.user && await permissions.checkPublicWritePermission(context.user.id, post.planet)) {
    const user = await Users.findOne({_id: context.user.id});
    const planet = await Planets.findOne({_id: post.planet});
    const reply = new ForumReplies({
      postId: post._id,
      componentId: post.componentId,
      content: args.content,
      owner: context.user.id,
      planet: post.planet,
      reactions: [],
      stickied: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      mentions: await getMentions(args.content, user, `the forum thread [${post.name}](${process.env.SITE_URL}/planet/${post.planet}/${post.componentId}/${post._id})`, planet)
    });
    await ForumPosts.findOneAndUpdate({_id: args.postId}, {$set: {updatedAt: new Date()}, $inc: {replyCount: 1}});
    return reply.save();
  } else {
    throw new Error("Not found.");
  }
}

/**
 * Arguments for {@link updateForumReply}.
 */
interface IUpdateForumReplyArgs {
  /** The ID of the forum reply to update. */
  replyId: string,
  /** The new content of the forum reply. */
  content: string
}

/**
 * Updates a forum reply.
 * 
 * @param root Unused.
 * @param args The arguments to be used to update the forum reply. See {@link IUpdateForumReplyArgs}.
 * @param context The current user context for the request.
 * 
 * @return A promise resolving to the updated forum reply.
 * 
 * @throws Throws an error if the user does not have full write permission on the planet and does not own the reply.
 * @throws Throws an error if the reply is not found.
 */
async function updateForumReply(root: undefined, args: IUpdateForumReplyArgs, context: Context): Promise<IForumReply> {
  const post = await ForumReplies.findOne({_id: args.replyId});
  if(post && context.user) {
    if(await permissions.checkFullWritePermission(context.user.id, post.planet) || post.owner == context.user.id) {
      return ForumReplies.findOneAndUpdate({_id: args.replyId}, {$set: {content: args.content}}, {new: true});
    } else {
      throw new Error("Not found.");
    }
  } else {
    throw new Error("Not found.");
  }
}

/**
 * Arguments for {@link deleteForumReply}.
 */
interface IDeleteForumReplyArgs {
  replyId: string
}

/**
 * Deletes a forum reply.
 * 
 * @param root Unused.
 * @param args The arguments to be used to delete the forum reply. See {@link IDeleteForumReplyArgs}.
 * @param context The current user context for the request.
 * 
 * @return A promise resolving to the deleted forum reply.
 * 
 * @throws Throws an error if the user does not have full write permission on the planet and does not own the reply.
 * @throws Throws an error if the reply is not found.
 */
async function deleteForumReply(root: undefined, args: IDeleteForumReplyArgs, context: Context): Promise<boolean> {
  const post = await ForumReplies.findOne({_id: args.replyId});
  if(post && context.user) {
    if(await permissions.checkFullWritePermission(context.user.id, post.planet) || post.owner == context.user.id) {
      await ForumReplies.deleteOne({_id: args.replyId});
      await ForumPosts.findOneAndUpdate({_id: post.postId}, {$inc: {replyCount: -1}});
      return true;
    } else {
      throw new Error("Not found.");
    }
  } else {
    throw new Error("Not found.");
  }
}

/**
 * Arguments for {@link forumReplyReact}.
 */
interface IForumReplyReactArgs {
  /** The ID of the forum reply to react to. */
  replyId: string,
  /** The reaction type. */
  emojiId: string
}

/**
 * Reacts to a forum reply.
 * 
 * @param root Unused.
 * @param args The arguments to be used to react to the forum reply. See {@link IForumReplyReactArgs}.
 * @param context The current user context for the request.
 * 
 * @return A promise resolving to the forum reply.
 * 
 * @throws Throws an error if the user does not have public write permission on the planet.
 * @throws Throws an error if the reply is not found.
 * @throws Throws an error if the custom emoji is not found.
 */
async function forumReplyReact(root: undefined, args: IForumReplyReactArgs, context: Context): Promise<IForumReply> {
  const post = await ForumReplies.findOne({_id: args.replyId});
  if(post && context.user) {
    if(await permissions.checkPublicWritePermission(context.user.id, post.planet)) {
      if(emoji.hasEmoji(args.emojiId) || args.emojiId.startsWith("ceid:")) {
        const reaction = post.reactions.find(value => value.emoji === args.emojiId);
        if(reaction) {
          if(reaction.reactors.includes(context.user.id)) {
            if(reaction.reactors.length === 1) {
              return ForumReplies.findOneAndUpdate({_id: args.replyId}, {$pull: {reactions: reaction}}, {new: true});
            } else {
              return ForumReplies.findOneAndUpdate({_id: args.replyId, reactions: {$elemMatch: {emoji: args.emojiId}}}, {$pull: {"reactions.$.reactors": context.user.id}}, {new: true});
            }
          } else {
            return ForumReplies.findOneAndUpdate({_id: args.replyId, reactions: {$elemMatch: {emoji: args.emojiId}}}, {$push: {"reactions.$.reactors": context.user.id}}, {new: true});
          }
        } else {
          // format for custom emojis is ceid:id
          if(args.emojiId.startsWith("ceid:")) {
            const emoji = args.emojiId.split(":");
            const emojiObject = await CustomEmojis.findOne({_id: emoji[1]});
            if(!emojiObject) {
              throw new Error("Invalid custom emoji.");
            }
          }
          return ForumReplies.findOneAndUpdate({_id: args.replyId}, {$push: {reactions: {emoji: args.emojiId, reactors: [context.user.id]}}}, {new: true});
        }
      }
    } else {
      throw new Error("Not found.");
    }
  } else {
    throw new Error("Not found.");
  }
}

export default {fieldResolvers, forumReply, insertForumReply, updateForumReply, deleteForumReply, forumReplyReact};