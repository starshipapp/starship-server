import DataLoader from "dataloader";
import { IFileObject } from "../database/components/files/FileObjects";
import { IForumPost } from "../database/components/forum/ForumPosts";
import { IForum } from "../database/components/forum/Forums";
import { IPlanet } from "../database/Planets";
import { IUser } from "../database/Users";
import fileObjectLoader from "./loaders/FileObjectLoader";
import forumLoader from "./loaders/ForumLoader";
import forumPostLoader from "./loaders/ForumPostLoader";
import planetLoader from "./loaders/PlanetLoader";
import userLoader from "./loaders/UserLoader";

export default class Loaders {
  constructor() {
    this.userLoader = new DataLoader<string, IUser>(userLoader);
    this.planetLoader = new DataLoader<string, IPlanet>(planetLoader);
    this.forumLoader = new DataLoader<string, IForum>(forumLoader);
    this.forumPostLoader = new DataLoader<string, IForumPost>(forumPostLoader);
    this.fileObjectLoader = new DataLoader<string, IFileObject>(fileObjectLoader);
  }

  userLoader: DataLoader<string, IUser>;
  planetLoader: DataLoader<string, IPlanet>;
  forumLoader: DataLoader<string, IForum>;
  forumPostLoader: DataLoader<string, IForumPost>;
  fileObjectLoader: DataLoader<string, IFileObject>;
}