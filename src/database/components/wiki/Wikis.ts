const mongoose = require('mongoose');
const customId = require('mongoose-hook-custom-id');

const wikiSchema = mongoose.Schema({
  _id: String,
  owner: String,
  updatedAt: Date,
  planet: String,
  createdAt: Date,
})

wikiSchema.plugin(customId, mongoose);

export const Wikis = mongoose.model('wikis', wikiSchema);