/* eslint-disable semi */
// enabling semicolon linting here results in a feedback loop of "needs semicolon" and "unnessecary semi-colon"
import { IUser } from "../database/Users";
import IUserToken from "./IUserToken";
import Loaders from "./Loaders";

/**
 * Object representing a user context.
 */
export default class Context {
  loaders: Loaders
  user: IUserToken
  subscriptionUser?: IUser
}