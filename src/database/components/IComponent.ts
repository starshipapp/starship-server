import {Document} from "mongoose";

export interface IComponent extends Document {
  _id: string,
  createdAt: Date,
  owner: string,
  updatedAt: Date,
  planet: string
}
