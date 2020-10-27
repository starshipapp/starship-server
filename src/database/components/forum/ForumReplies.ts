const mongoose = require('mongoose');
const customId = require('mongoose-hook-custom-id');

const forumRepliesSchema = new mongoose.Schema({
  _id: String,
  postId: String,
  componentId: String,
  content: String,
  owner: String,
  planet: String,
  reactions: [{emoji: String, reactors: [String]}],
  replyCount: Number,
  stickied: Boolean,
  createdAt: Date,
  updatedAt: Date
})

forumRepliesSchema.plugin(customId, {mongoose: mongoose});

export const ForumReplies = mongoose.model('forumreplies', forumRepliesSchema);