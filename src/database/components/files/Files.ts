const mongoose = require('mongoose');
const customId = require('mongoose-hook-custom-id');

const filesSchema = new mongoose.Schema({
  _id: String,
  owner: String,
  updatedAt: Date,
  planet: String,
  createdAt: Date,
})

filesSchema.plugin(customId, {mongoose: mongoose});

export const Files = mongoose.model('files', filesSchema);