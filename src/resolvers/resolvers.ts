const Users = require('./Users');

const resolvers = {
  Query: {
    user: Users.user,
    adminUser: Users.adminUser,
    adminUsersRecent: Users.adminUsersRecent,
    currentUser: Users.currentUser
  },
  Mutation: {
    insertUser: Users.insertUser,
    loginUser: Users.loginUser,
    banUser: Users.banUser
  }
};

export default resolvers