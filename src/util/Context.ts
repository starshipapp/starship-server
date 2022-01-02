/* eslint-disable semi */
// enabling semicolon linting here results in a feedback loop of "needs semicolon" and "unnessecary semi-colon"
import { IUser } from "../database/Users";
import IUserToken from "./IUserToken";
import Loaders from "./Loaders";

/**
 * Object representing a request context.
 */
export default class Context {
  /** The data loaders for the current request. */
  loaders: Loaders
  /** The user token associated with the current request. */
  user: IUserToken
  /** The user object at the time of the subscription start. */
  subscriptionUser?: IUser
}