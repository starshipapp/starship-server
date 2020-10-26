const mongoose = require('mongoose');
const customId = require('mongoose-hook-custom-id');

const forumPostSchema = mongoose.Schema({
  _id: String,
  name: String,
  componentId: String,
  content: String,
  owner: String,
  planet: String,
  tags: [String],
  reactions: [{emoji: String, reactors: [String]}],
  replyCount: Number,
  stickied: Boolean,
  locked: Boolean,
  createdAt: Date,
  updatedAt: Date
})

forumPostSchema.plugin(customId, mongoose);

export const ForumPosts = mongoose.model('forumposts', forumPostSchema);