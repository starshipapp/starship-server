const mongoose = require('mongoose');
const customId = require('mongoose-hook-custom-id');

const pageSchema = mongoose.Schema({
  _id: String,
  createdAt: Date,
  owner: String,
  updatedAt: Date,
  planet: String,
  content: String,
})

pageSchema.plugin(customId, {mongoose: mongoose});

export const Pages = mongoose.model('pages', pageSchema);