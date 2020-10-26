const mongoose = require('mongoose');
const customId = require('mongoose-hook-custom-id');

const inviteSchema = mongoose.Schema({
  _id: String,
  planet: String,
  owner: String,
  createdAt: Date,
})

inviteSchema.plugin(customId, mongoose);

export const Invites = mongoose.model('invites', inviteSchema);