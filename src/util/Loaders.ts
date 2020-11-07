import DataLoader from "dataloader";
import { IPlanet } from "../database/Planets";
import { IUser } from "../database/Users";
import planetLoader from "./loaders/PlanetLoader";
import userLoader from "./loaders/UserLoader";

export default class Loaders {
  constructor() {
    this.userLoader = new DataLoader<string, IUser>(userLoader);
    this.planetLoader = new DataLoader<string, IPlanet>(planetLoader);
  }

  userLoader: DataLoader<string, IUser>;
  planetLoader: DataLoader<string, IPlanet>;
}