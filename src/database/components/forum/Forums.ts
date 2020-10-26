const mongoose = require('mongoose');
const customId = require('mongoose-hook-custom-id');

const forumSchema = mongoose.Schema({
  owner: String,
  updatedAt: Date,
  planet: String,
  createdAt: Date,
})

forumSchema.plugin(customId, mongoose);

export const Forum = mongoose.model('forums', forumSchema);