const mongoose = require('mongoose');
const customId = require('mongoose-hook-custom-id');

const planetSchema = mongoose.Schema({
  _id: String,
  name: String,
  createdAt: String,
  owner: String,
  private: String,
  followerCount: Number,
  components: [{name: String, componentId: String, type: String}],
  homeComponent: {name: String, componentId: String, type: String},
  featured: Boolean,
  verified: Boolean,
  partnered: Boolean,
  featuredDescription: String,
  banned: [String]
})

planetSchema.plugin(customId, {mongoose: mongoose});

export const Planets = mongoose.model('planets', planetSchema);