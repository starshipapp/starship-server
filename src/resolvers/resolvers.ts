const Users = require('./Users');
const Reports = require('./Reports');

const resolvers = {
  Query: {
    user: Users.user,
    adminUser: Users.adminUser,
    adminUsersRecent: Users.adminUsersRecent,
    currentUser: Users.currentUser,
    report: Reports.report,
    allReports: Reports.allReports,
    reportsByUser: Reports.reportsByUser
  },
  Mutation: {
    insertUser: Users.insertUser,
    loginUser: Users.loginUser,
    banUser: Users.banUser,
    insertReport: Reports.insertReport,
    solveReport: Reports.solveReport
  }
};

export default resolvers