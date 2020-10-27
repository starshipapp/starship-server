const mongoose = require('mongoose');
const customId = require('mongoose-hook-custom-id');

const userSchema = mongoose.Schema({
  _id: String,
  services: Object,
  username: String,
  createdAt: Date,
  profilePicture: String,
  emails: [{address: String, verified: Boolean}],
  following: [String],
  banned: Boolean,
  admin: Boolean
})

userSchema.plugin(customId, {mongoose: mongoose});

export const Users = mongoose.model('users', userSchema);