/* eslint-disable @typescript-eslint/naming-convention */
import Users from "./Users";
import Reports from "./Reports";
import Planets from "./Planets";

const resolvers = {
  User: Users.fieldResolvers,
  Report: Reports.fieldResolvers,
  Planet: Planets.fieldResolvers,
  Query: {
    // Users
    user: Users.user,
    adminUser: Users.adminUser,
    adminUsersRecent: Users.adminUsersRecent,
    currentUser: Users.currentUser,
    // Reports
    report: Reports.report,
    allReports: Reports.allReports,
    reportsByUser: Reports.reportsByUser,
    // Planets
    featuredPlanets: Planets.featuredPlanets,
    planet: Planets.planet,
    adminPlanets: Planets.adminPlanets,
  },
  Mutation: {
    // Users
    insertUser: Users.insertUser,
    loginUser: Users.loginUser,
    banUser: Users.banUser,
    // Reports
    insertReport: Reports.insertReport,
    solveReport: Reports.solveReport,
    // Planets
    insertPlanet: Planets.insertPlanet,
    addComponent: Planets.addComponent,
    followPlanet: Planets.followPlanet,
    removeComponent: Planets.removeComponent,
    updateName: Planets.updateName,
    togglePrivate: Planets.togglePrivate,
    renameComponent: Planets.renameComponent,
    applyModTools: Planets.applyModTools,
    toggleBan: Planets.toggleBan
  }
};

export default resolvers;