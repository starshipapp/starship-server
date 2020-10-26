const mongoose = require('mongoose');
const customId = require('mongoose-hook-custom-id');

const wikiPageSchema = mongoose.Schema({
  _id: String,
  wikiId: String,
  content: String,
  planet: String,
  createdAt: Date,
})

wikiPageSchema.plugin(customId, mongoose);

export const WikiPages = mongoose.model('wikipages', wikiPageSchema);