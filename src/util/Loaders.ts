import DataLoader from "dataloader";
import { IChannel } from "../database/components/chat/Channels";
import { IChat } from "../database/components/chat/Chats";
import { IFileObject } from "../database/components/files/FileObjects";
import { IForumPost } from "../database/components/forum/ForumPosts";
import { IForum } from "../database/components/forum/Forums";
import { IPlanet } from "../database/Planets";
import { IUser } from "../database/Users";
import { IMessage } from "../database/components/chat/Messages";
import { IAttachment } from "../database/Attachments";
import attachmentLoader from "./loaders/AttachmentLoader";
import chatLoader from "./loaders/ChatLoader";
import channelLoader from "./loaders/ChannelLoader";
import fileObjectLoader from "./loaders/FileObjectLoader";
import forumLoader from "./loaders/ForumLoader";
import forumPostLoader from "./loaders/ForumPostLoader";
import planetLoader from "./loaders/PlanetLoader";
import userLoader from "./loaders/UserLoader";
import messageLoader from "./loaders/MessageLoader";

export default class Loaders {
  constructor() {
    this.userLoader = new DataLoader<string, IUser>(userLoader);
    this.planetLoader = new DataLoader<string, IPlanet>(planetLoader);
    this.forumLoader = new DataLoader<string, IForum>(forumLoader);
    this.forumPostLoader = new DataLoader<string, IForumPost>(forumPostLoader);
    this.fileObjectLoader = new DataLoader<string, IFileObject>(fileObjectLoader);
    this.channelLoader = new DataLoader<string, IChannel>(channelLoader);
    this.chatLoader = new DataLoader<string, IChat>(chatLoader);
    this.messageLoader = new DataLoader<string, IMessage>(messageLoader);
    this.attachmentLoader = new DataLoader<string, IAttachment>(attachmentLoader);
  }

  userLoader: DataLoader<string, IUser>;
  planetLoader: DataLoader<string, IPlanet>;
  forumLoader: DataLoader<string, IForum>;
  forumPostLoader: DataLoader<string, IForumPost>;
  fileObjectLoader: DataLoader<string, IFileObject>;
  channelLoader: DataLoader<string, IChannel>;
  chatLoader: DataLoader<string, IChat>;
  messageLoader: DataLoader<string, IMessage>;
  attachmentLoader: DataLoader<string, IAttachment>;
}