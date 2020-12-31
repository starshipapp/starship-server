import DataLoader from "dataloader";
import { IForum } from "../database/components/forum/Forums";
import { IPlanet } from "../database/Planets";
import { IUser } from "../database/Users";
import forumLoader from "./loaders/ForumLoader";
import planetLoader from "./loaders/PlanetLoader";
import userLoader from "./loaders/UserLoader";

export default class Loaders {
  constructor() {
    this.userLoader = new DataLoader<string, IUser>(userLoader);
    this.planetLoader = new DataLoader<string, IPlanet>(planetLoader);
    this.forumLoader = new DataLoader<string, IForum>(forumLoader);
  }

  userLoader: DataLoader<string, IUser>;
  planetLoader: DataLoader<string, IPlanet>;
  forumLoader: DataLoader<string, IForum>;
}