const mongoose = require('mongoose');
const customId = require('mongoose-hook-custom-id');

const pageSchema = mongoose.Schema({
  createdAt: Date,
  owner: String,
  updatedAt: Date,
  planet: String,
  content: String,
})

pageSchema.plugin(customId, mongoose);

export const Pages = mongoose.model('pages', pageSchema);