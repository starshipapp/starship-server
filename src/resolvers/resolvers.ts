/* eslint-disable @typescript-eslint/unbound-method */
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
import Notifications from "./Notifications";
import SysInfo from "../util/SysInfo";
import CustomEmojis from "./CustomEmojis";

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
  Notification: Notifications.fieldResolvers,
  CustomEmoji: CustomEmojis.fieldResolvers,
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
    searchForPlanets: Planets.searchForPlanets,
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
    getObjectPreview: AWS.getObjectPreview,
    // Notifications
    notifications: Notifications.notifications,
    notification: Notifications.notification,
    // Custom Emojis
    customEmoji: CustomEmojis.customEmoji,
    // SysInfo
    sysInfo: SysInfo.querySysInfo
  },
  Subscription: {
    notificationRecieved: Notifications.notificationRecieved
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
    generateTOTPSecret: Users.generateTOTPSecret,
    confirmTFA: Users.confirmTFA,
    disableTFA: Users.disableTFA,
    finalizeAuthorization: Users.finalizeAuthorization,
    toggleBlockUser: Users.toggleBlockUser,
    updateProfileBio: Users.updateProfileBio,
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
    deletePlanet: Planets.deletePlanet,
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
    cancelUpload: FileObjects.cancelUpload,
    // AWS
    uploadFileObject: AWS.uploadFileObject,
    deleteFileObject: AWS.deleteFileObject,
    uploadProfilePicture: AWS.uploadProfilePicture,
    uploadMarkdownImage: AWS.uploadMarkdownImage,
    completeUpload: AWS.completeUpload,
    copyFile: AWS.copyFile,
    uploadProfileBanner: AWS.uploadProfileBanner,
    uploadCustomEmoji: AWS.uploadCustomEmoji,
    // Notifications
    clearNotification: Notifications.clearNotification,
    clearAllNotifications: Notifications.clearAllNotifications,
    markAllRead: Notifications.markAllRead,
    // Custom Emojis
    deleteCustomEmoji: CustomEmojis.deleteCustomEmoji
  }
};

export default resolvers;