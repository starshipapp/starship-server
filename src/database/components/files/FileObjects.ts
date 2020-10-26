const mongoose = require('mongoose');
const customId = require('mongoose-hook-custom-id');

const fileObjectsSchema = new mongoose.Schema({
  path: [String],
  parent: String,
  name: String,
  planet: String,
  owner: String,
  createdAt: Date,
  componentId: String,
  type: String,
  fileType: String,
  finishedUploading: Boolean
})

fileObjectsSchema.plugin(customId, mongoose);

export const FileObjects = mongoose.model('fileobjects', fileObjectsSchema);