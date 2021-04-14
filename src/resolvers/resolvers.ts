/* eslint-disable @typescript-eslint/naming-convention */
import Users from "./Users";
import Reports from "./Reports";
import Planets from "./Planets";
import Pages from "./components/Pages";
import Invites from "./Invites";
import WikiPages from "./components/wikis/WikiPages";
import Wikis from "./components/wikis/Wikis";
import Forums from "./components/forums/Forums";
import ForumPosts from "./components/forums/ForumPosts";
import ForumReplies from "./components/forums/ForumReplies";
import Files from "./components/files/Files";
import FileObjects from "./components/files/FileObjects";
import AWS from "./AWS";

const resolvers = {
  User: Users.fieldResolvers,
  Report: Reports.fieldResolvers,
  Planet: Planets.fieldResolvers,
  Page: Pages.fieldResolvers,
  Invite: Invites.fieldResolvers,
  Wiki: Wikis.fieldResolvers,
  WikiPage: WikiPages.fieldResolvers,
  Forum: Forums.fieldResolvers,
  ForumPost: ForumPosts.fieldResolvers,
  ForumReply: ForumReplies.fieldResolvers,
  FileComponent: Files.fieldResolvers,
  FileObject: FileObjects.fieldResolvers,
  Query: {
    // Users
    user: Users.user,
    adminUser: Users.adminUser,
    adminUsers: Users.adminUsers,
    currentUser: Users.currentUser,
    // Reports
    report: Reports.report,
    allReports: Reports.allReports,
    reportsByUser: Reports.reportsByUser,
    // Planets
    featuredPlanets: Planets.featuredPlanets,
    planet: Planets.planet,
    adminPlanets: Planets.adminPlanets,
    searchForPlanet: Planets.searchForPlanet,
    // Pages
    page: Pages.page,
    // Invites
    invite: Invites.invite,
    // Wikis
    wiki: Wikis.wiki,
    wikiPage: WikiPages.wikiPage,
    // Forums
    forum: Forums.forum,
    forumPost: ForumPosts.forumPost,
    forumReply: ForumReplies.forumReply,
    // Files
    fileComponent: Files.fileComponent,
    fileObject: FileObjects.fileObject,
    folders: FileObjects.folders,
    files: FileObjects.files,
    fileObjectArray: FileObjects.fileObjectArray,
    searchForFiles: FileObjects.searchForFiles,
    // AWS
    downloadFileObject: AWS.downloadFileObject,
    downloadFolderObject: AWS.downloadFolderObject,
    getObjectPreview: AWS.getObjectPreview
  },
  Mutation: {
    // Users
    insertUser: Users.insertUser,
    loginUser: Users.loginUser,
    banUser: Users.banUser,
    resetPassword: Users.resetPassword,
    sendResetPasswordEmail: Users.sendResetPasswordEmail,
    resendVerificationEmail: Users.resendVerificationEmail,
    activateEmail: Users.activateEmail,
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
    setDescription: Planets.setDescription,
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
    removeForumTag: Forums.removeForumTag,
    insertForumPost: ForumPosts.insertForumPost,
    updateForumPost: ForumPosts.updateForumPost,
    deleteForumPost: ForumPosts.deleteForumPost,
    stickyForumPost: ForumPosts.stickyForumPost,
    lockForumPost: ForumPosts.lockForumPost,
    forumPostReact: ForumPosts.forumPostReact,
    insertForumReply: ForumReplies.insertForumReply,
    updateForumReply: ForumReplies.updateForumReply,
    deleteForumReply: ForumReplies.deleteForumReply,
    forumReplyReact: ForumReplies.forumReplyReact,
    // Files
    createFolder: FileObjects.createFolder,
    renameObject: FileObjects.renameObject,
    moveObject: FileObjects.moveObject,
    // AWS
    uploadFileObject: AWS.uploadFileObject,
    deleteFileObject: AWS.deleteFileObject,
    uploadProfilePicture: AWS.uploadProfilePicture,
    uploadMarkdownImage: AWS.uploadMarkdownImage,
    completeUpload: AWS.completeUpload,
  }
};

export default resolvers;