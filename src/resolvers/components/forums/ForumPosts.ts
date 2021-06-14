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

interface IReplyResolverArgs {
  limit?: number,
  cursor?: string
}

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

interface IForumPostArgs {
  id: string
}

async function forumPost(root: undefined, args: IForumPostArgs, context: Context): Promise<IForumPost> {
  const forumpost = await ForumPosts.findOne({_id: args.id});
  if(forumpost) {
    if(await permissions.checkReadPermission(context.user?.id ?? null, forumpost.planet)) {
      return forumpost;
    } else {
      throw new Error("Not found.");
    }
  } else {
    throw new Error("Not found.");
  }
}

interface IInsertForumPostArgs {
  forumId: string
  name: string
  content: string
  tag?: string
}

async function insertForumPost(root: undefined, args: IInsertForumPostArgs, context: Context): Promise<IForumPost> {
  const forum = await Forums.findOne({_id: args.forumId});
  if(forum && context.user && await permissions.checkPublicWritePermission(context.user.id, forum.planet)) {
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
  } else {
    throw new Error("Not found.");
  }
}

interface IUpdateForumPost {
  postId: string,
  content: string
}

async function updateForumPost(root: undefined, args: IUpdateForumPost, context: Context): Promise<IForumPost> {
  const post = await ForumPosts.findOne({_id: args.postId});
  if(post && context.user) {
    if(await permissions.checkFullWritePermission(context.user.id, post.planet) || post.owner == context.user.id) {
      return ForumPosts.findOneAndUpdate({_id: args.postId}, {$set: {content: args.content}}, {new: true});
    } else {
      throw new Error("Not found.");
    }
  } else {
    throw new Error("Not found.");
  }
}

interface IGenericForumPostArgs {
  postId: string
}

async function deleteForumPost(root: undefined, args: IGenericForumPostArgs, context: Context): Promise<boolean> {
  const post = await ForumPosts.findOne({_id: args.postId});
  if(post && context.user) {
    if(await permissions.checkFullWritePermission(context.user.id, post.planet) || post.owner == context.user.id) {
      await ForumPosts.deleteOne({_id: args.postId});
      await ForumReplies.deleteMany({postId: args.postId});
      return true;
    } else {
      throw new Error("Not found.");
    }
  } else {
    throw new Error("Not found.");
  }
}

async function lockForumPost(root: undefined, args: IGenericForumPostArgs, context: Context): Promise<IForumPost> {
  const post = await ForumPosts.findOne({_id: args.postId});
  if(post && context.user) {
    if(await permissions.checkFullWritePermission(context.user.id, post.planet)) {
      return ForumPosts.findOneAndUpdate({_id: args.postId}, {$set: {locked: !post.locked}}, {new: true});
    } else {
      throw new Error("Not found.");
    }
  } else {
    throw new Error("Not found.");
  }
}

async function stickyForumPost(root: undefined, args: IGenericForumPostArgs, context: Context): Promise<IForumPost> {
  const post = await ForumPosts.findOne({_id: args.postId});
  if(post && context.user) {
    if(await permissions.checkFullWritePermission(context.user.id, post.planet)) {
      return ForumPosts.findOneAndUpdate({_id: args.postId}, {$set: {stickied: !post.stickied}}, {new: true});
    } else {
      throw new Error("Not found.");
    }
  } else {
    throw new Error("Not found.");
  }
}

interface IForumPostReactArgs {
  postId: string,
  emojiId: string
}

async function forumPostReact(root: undefined, args: IForumPostReactArgs, context: Context): Promise<IForumPost> {
  const post = await ForumPosts.findOne({_id: args.postId});
  if(post && context.user) {
    if(await permissions.checkPublicWritePermission(context.user.id, post.planet)) {
      if(emoji.hasEmoji(args.emojiId) || args.emojiId.startsWith("ceid:")) {
        const reaction = post.reactions.find(value => value.emoji === args.emojiId);
        if(reaction) {
          if(reaction.reactors.includes(context.user.id)) {
            if(reaction.reactors.length === 1) {
              return ForumPosts.findOneAndUpdate({_id: args.postId}, {$pull: {reactions: reaction}}, {new: true});
            } else {
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
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
              throw new Error("Invalid custom emoji.");
            }
          }
          return ForumPosts.findOneAndUpdate({_id: args.postId}, {$push: {reactions: {emoji: args.emojiId, reactors: [context.user.id]}}}, {new: true});
        }
      } else {
        throw new Error("Invalid emoji.");
      }
    } else {
      throw new Error("Not found.");
    }
  } else {
    throw new Error("Not found.");
  }
}


export default {fieldResolvers, forumPost, insertForumPost, updateForumPost, deleteForumPost, lockForumPost, stickyForumPost, forumPostReact};
