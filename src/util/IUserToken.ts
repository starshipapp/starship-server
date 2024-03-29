/* eslint-disable semi */
// enabling semicolon linting here results in a feedback loop of "needs semicolon" and "unnessecary semi-colon"

/**
 * Interface for the JWT user token.
 */
export default interface IUserToken {
  id: string,
  username: string,
  admin: boolean
}