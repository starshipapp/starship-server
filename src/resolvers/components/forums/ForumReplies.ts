import ForumPosts, { IForumPost } from "../../../database/components/forum/ForumPosts";
import ForumReplies, { IForumReply } from "../../../database/components/forum/ForumReplies";
import { IForum } from "../../../database/components/forum/Forums";
import { IPlanet } from "../../../database/Planets";
import { IUser } from "../../../database/Users";
import Context from "../../../util/Context";
import permissions from "../../../util/permissions";
import emoji from "node-emoji";
import CustomEmojis from "../../../database/CustomEmojis";

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
  }
};

interface IForumReplyArgs {
  id: string
}

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

interface IInsertForumReplyArgs {
  postId: string,
  content: string,
}

async function insertForumReply(root: undefined, args: IInsertForumReplyArgs, context: Context): Promise<IForumReply> {
  const post = await ForumPosts.findOne({_id: args.postId});
  if(post && context.user && await permissions.checkPublicWritePermission(context.user.id, post.planet)) {
    const reply = new ForumReplies({
      postId: post._id,
      componentId: post.componentId,
      content: args.content,
      owner: context.user.id,
      planet: post.planet,
      reactions: [],
      stickied: false,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await ForumPosts.findOneAndUpdate({_id: args.postId}, {$set: {updatedAt: new Date()}, $inc: {replyCount: 1}});
    return reply.save();
  } else {
    throw new Error("Not found.");
  }
}

interface IUpdateForumReplyArgs {
  replyId: string,
  content: string
}

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

interface IDeleteForumReplyArgs {
  replyId: string
}

async function deleteForumReply(root: undefined, args: IDeleteForumReplyArgs, context: Context): Promise<boolean> {
  const post = await ForumReplies.findOne({_id: args.replyId});
  if(post && context.user) {
    if(await permissions.checkFullWritePermission(context.user.id, post.planet) || post.owner == context.user.id) {
      await ForumReplies.remove({_id: args.replyId});
      await ForumPosts.findOneAndUpdate({_id: post.postId}, {$inc: {replyCount: -1}});
      return true;
    } else {
      throw new Error("Not found.");
    }
  } else {
    throw new Error("Not found.");
  }
}

interface IForumReplyReactArgs {
  replyId: string,
  emojiId: string
}

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
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              return ForumReplies.findOneAndUpdate({_id: args.replyId, reactions: {$elemMatch: {emoji: args.emojiId}}}, {$pull: {"reactions.$.reactors": context.user.id}}, {new: true});
            }
          } else {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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