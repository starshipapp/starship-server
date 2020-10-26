const mongoose = require('mongoose');
const customId = require('mongoose-hook-custom-id');

const reportSchema = mongoose.Schema({
  _id: String,
  owner: String,
  createdAt: Date,
  objectType: Number,
  objectId: String,
  reportType: Number,
  details: String,
  userId: String,
  solved: Boolean
})

reportSchema.plugin(customId, mongoose);

export const Reports = mongoose.model('reports', reportSchema);