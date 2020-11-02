/* eslint-disable semi */
// enabling semicolon linting here results in a feedback loop of "needs semicolon" and "unnessecary semi-colon"
import IUserToken from "./IUserToken";

export default interface IContext {
  user: IUserToken
}