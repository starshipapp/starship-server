/* eslint-disable @typescript-eslint/naming-convention */
import Users from "./Users";
import Reports from "./Reports";
import Planets from "./Planets";
import Pages from "./components/Pages";
import Invites from "./Invites";
import WikiPages from "./components/wikis/WikiPages";
import Wikis from "./components/wikis/Wikis";
import Forums from "./components/forums/Forums";

const resolvers = {
  User: Users.fieldResolvers,
  Report: Reports.fieldResolvers,
  Planet: Planets.fieldResolvers,
  Page: Pages.fieldResolvers,
  Invite: Invites.fieldResolvers,
  Wiki: Wikis.fieldResolvers,
  WikiPage: WikiPages.fieldResolvers,
  Forum: Forums.fieldResolvers,
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
    // Pages
    page: Pages.page,
    // Invites
    invite: Invites.invite,
    // Wikis
    wiki: Wikis.wiki,
    wikiPage: WikiPages.wikiPage,
    // Forums
    forum: Forums.forum
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
    removeMember: Planets.removeMember,
    removeComponent: Planets.removeComponent,
    updateName: Planets.updateName,
    togglePrivate: Planets.togglePrivate,
    renameComponent: Planets.renameComponent,
    applyModTools: Planets.applyModTools,
    toggleBan: Planets.toggleBan,
    setCSS: Planets.setCSS,
    // Pages
    updatePage: Pages.updatePage,
    // Invites
    insertInvite: Invites.insertInvite,
    useInvite: Invites.useInvite,
    removeInvite: Invites.removeInvite,
    // Wikis
    insertWikiPage: WikiPages.insertWikiPage,
    updateWikiPage: WikiPages.updateWikiPage,
    removeWikiPage: WikiPages.removeWikiPage,
    renameWikiPage: WikiPages.renameWikiPage,
    // Forums
    createForumTag: Forums.createForumTag,
    removeForumTag: Forums.removeForumTag
  }
};

export default resolvers;