import Users, { IUser, safeUserFields } from "../database/Users";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import permissions from "../util/permissions";
import Context from "../util/Context";
import Loggers from "../Loggers";
import Planets, { IPlanet } from "../database/Planets";
import {sendForgotPasswordEmail, sendVerificationEmail} from "../util/Emails";
import { v4 } from "uuid";
import axios from "axios";
import { authenticator, totp } from "otplib";
import Crypto from "crypto";
import CustomEmojis, { ICustomEmoji } from "../database/CustomEmojis";
import MentionSettings from "../util/MentionSettings";
import { ForbiddenError } from "../util/ForbiddenError";
import { ApolloError, UserInputError } from "apollo-server-errors";
import { NotFoundError } from "../util/NotFoundError";
import { BadSessionError } from "../util/BadSessionError";

/**
 * Resolvers for the fields of the GraphQL type.
 */
const fieldResolvers = {
  following: async (root: IUser, args: undefined, context: Context): Promise<IPlanet[]> => {
    if(root._id != context.user.id) throw new ForbiddenError();

    const loaded = await context.loaders.planetLoader.loadMany(root.following);
    return loaded as IPlanet[];
  },
  memberOf: async (root: IUser, args: undefined, context: Context): Promise<IPlanet[]> => {
    if(root._id != context.user.id) throw new ForbiddenError();

    const loaded = await Planets.find({
      $or: [
        {owner: context.user.id},
        {members: context.user.id}
      ]
    });
    return loaded;
  },
  blockedUsers: async (root: IUser, args: undefined, context: Context): Promise<IUser[]> => {
    if(root._id != context.user.id) throw new ForbiddenError();
    if(root.blocked && root.blocked.length > 0) return [];

    const loaded = await context.loaders.userLoader.loadMany(root.blocked);
    return loaded as IUser[];
  },
  online: (root: IUser): boolean => {
    if(root._id) {
      return root.sessions.length > 0;
    }
  },
  customEmojis: async (root: IUser): Promise<ICustomEmoji[]> => {
    if(root._id) {
      return CustomEmojis.find({user: root._id});
    }
  }
};

/**
 * Arguments for {@link insertUser}.
 */
interface IInsertUserArgs {
  /** The email of the user. */
  email: string,
  /** The password of the user. */
  password: string,
  /** The username of the user. */
  username: string,
  /** The reCAPTCHA response. */
  recaptcha: string
}

/**
 * Handles user registration.
 * 
 * @param root Unused.
 * @param args The arguments for the registration. See {@link IRegisterUserArgs}.
 * 
 * @returns A promise that resolves to the user.
 * 
 * @throws Throws an error if the username is already taken.
 * @throws Throws an error if the email is already taken.
 * @throws Throws an error if the password is too short.
 * @throws Throws an error if the username does not match the filter.
 * @throws Throws an error if the reCAPTCHA is incorrect.
 */
async function insertUser(root: undefined, args: IInsertUserArgs): Promise<IUser> {
  const usernameCheck = await Users.findOne({username: args.username});
  const emailCheck = await Users.findOne({emails: {$elemMatch: {address: args.email}}});

  if(usernameCheck != undefined) throw new UserInputError('That username is taken.');

  if(emailCheck != undefined) throw new UserInputError('That email is taken.');

  if(args.password.length < 8) throw new UserInputError('Your password needs to be at least 8 characters long.');

  // Ensures a valid username. Required so that mentions can work.
  if(!/^\b[-.\w]+\b$/.test(args.username)) throw new UserInputError("Invalid username.");

  const secret = process.env.RECAPTCHA_SECRET;
  const response = args.recaptcha;

  let shouldContinue = true;

  // check if the recaptcha is valid
  if(secret) {
    shouldContinue = false;
    const res = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${response}`,
      {},
      {
        headers: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          "Content-Type": "application/x-www-form-urlencoded; charset=utf-8"
        },
      },
    );

    if(!res || !res.data) throw new ApolloError("reCAPTCHA verification failed. Contact system administrator.");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if(!res.data.success) throw new UserInputError("Invalid captcha.");

    shouldContinue = true;
  }

  if(shouldContinue) throw new ApolloError("Unknown error.");

  const password = bcrypt.hashSync(args.password, 3);
  const newUser: IUser = new Users({
    createdAt: new Date(),
    services: {
      password: {
        bcrypt: password
      }
    },
    username: args.username,
    emails: [{address: args.email, verified: false}],
    admin: false,
    following: []
  });

  const user = await newUser.save().catch((e) => {console.error(e);}) as IUser;
  if(process.env.SMTP_HOST) {
    // we have a mail server, send an email to the user
    await sendVerificationEmail(user);
  }
  return user;
}

/**
 * Arguments for {@link loginUser}.
 */
interface ILoginUserArgs {
  /** The user's user name. */
  username: string,
  /** The user's password. */
  password: string,
}

/**
 * Handles user login.
 * 
 * @param root Unused.
 * @param args The arguments for the login. See {@link ILoginUserArgs}.
 *
 * @returns A promise that resolves to the login information object.
 * 
 * @throws An error if the user is not found.
 * @throws An error if the password is incorrect.
 * @throws An error if the user has not verified their email.
 */
async function loginUser(root: undefined, args: ILoginUserArgs): Promise<{token: string, expectingTFA: boolean}> {
  const document = await Users.findOne({username: args.username}).catch((error) => {Loggers.mainLogger.error(error);}) as unknown as IUser;
  if(document == undefined) throw new ForbiddenError('Incorrect username or password.');
  if(process.env.SMTP_HOST && document.emails.filter((value) => {return value.verified == true;}).length < 1) throw new UserInputError('You need to verify your email.');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if(!bcrypt.compareSync(args.password, document.services.password.bcrypt)) throw new ForbiddenError('Incorrect username or password.');

  if(!document.tfaEnabled) {
    return {token: jwt.sign({id: document._id, username: document.username, admin: document.admin}, process.env.SECRET), expectingTFA: false};
  } else {
    // Send an unverified token to be used with finalizeAuthorization.
    return {token: jwt.sign({unverifiedId: document._id}, process.env.SECRET + "tfa"), expectingTFA: true};
  }
  
}

/**
 * Arguments for {@link activateEmail}.
 */
interface IActivateEmailArgs {
  /** The user to activate. */
  userId: string,
  /** The token to activate the user with. */
  token: string
}

/**
 * Confirms an email activation.
 * 
 * @param root Unused.
 * @param args The arguments for the activation. See {@link IActivateEmailArgs}.
 * 
 * @returns A promise that resolves to true if the activation was successful.
 * 
 * @throws Throws an error if the token is invalid.
 * @throws Throws an error if the user does not exist.
 */
async function activateEmail(root: undefined, args: IActivateEmailArgs): Promise<boolean> {
  const document = await Users.findOne({_id: args.userId});
  if(!document) throw new NotFoundError();

  const emails = document.emails.filter((value) => {return value.verificationToken == args.token;});
  if(emails.length == 0) throw new ForbiddenError("Invalid token.");

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  await Users.findOneAndUpdate({_id: document._id, emails: {$elemMatch: {verificationToken: args.token}}}, {$set: {"emails.$.verificationToken": v4(), "emails.$.verified": true}}, {new: true});
  return true;
}

/**
 * Arguments for {@link resetPassword}.
 */
interface IResetPasswordArgs {
  /** The user to reset the password for. */
  userId: string,
  /** The token to reset the password with. */
  token: string,
  /** The new password. */
  password: string
}

/**
 * Resets a user's password.
 * 
 * @param root Unused.
 * @param args The arguments for password reset. See {@link IResetPasswordArgs}.
 * 
 * @returns A promise that resolves to true if the reset was successful.
 * 
 * @throws Throws an error if the user does not exist.
 * @throws Throws an error if the token is invalid.
 */
async function resetPassword(root: undefined, args: IResetPasswordArgs): Promise<boolean> {
  const document = await Users.findOne({_id: args.userId});
  if(!document) throw new NotFoundError();
  if(!document.services.password.resetExpiry || !document.services.password.resetToken) throw new UserInputError("Invalid token.");
  if(document.services.password.resetToken != args.token) throw new UserInputError("Invalid token.");
  if(document.services.password.resetExpiry.getTime() < Date.now()) throw new UserInputError("Invalid token.");

  const newPassword = bcrypt.hashSync(args.password, 3);
  await Users.findOneAndUpdate({_id: document._id}, {$set: {services: {password: {bcrypt: newPassword, resetExpiry: new Date(Date.now()), resetToken: v4()}}}}, {new: true});
  return true;
}

/**
 * Arguments for {@link resendVerificationEmail}.
 */
interface IResendVerificationEmailArgs {
  /** The user to resend the verification email to. */
  username: string
}

/**
 * Resends the verification email.
 * 
 * @param root Unused.
 * @param args The arguments for the resend. See {@link IResendVerificationEmailArgs}.
 * 
 * @returns A promise that resolves to true if the email was sent.
 * 
 * @throws Throws an error if the user does not exist.
 * @throws Throws an error if the user is already verified.
 */
async function resendVerificationEmail(root: undefined, args: IResendVerificationEmailArgs): Promise<boolean> {
  const document = await Users.findOne({username: args.username});
  if(document == undefined) throw new UserInputError("User not found.");
  if(document.emails.filter((value) => {return !value.verified;}).length < 1) throw new UserInputError('Your email is already verified!');

  return sendVerificationEmail(document);
}

/**
 * Arguments for {@link sendResetPasswordEmail}.
 */
interface ISendResetPasswordEmailArgs {
  /** The user to send the reset password email to. */
  username: string
}

/**
 * Sends a reset password email.
 * 
 * @param root Unused.
 * @param args The arguments for the reset. See {@link ISendResetPasswordEmailArgs}.
 * 
 * @returns A promise that resolves to true if the email was sent.
 * 
 * @throws Throws an error if the user does not exist.
 */
async function sendResetPasswordEmail(root: undefined, args: ISendResetPasswordEmailArgs): Promise<boolean> {
  const document = await Users.findOne({username: args.username});
  if(document == undefined) throw new UserInputError("User not found.");
  
  return sendForgotPasswordEmail(document);
}

/**
 * Arguments for {@link banUser}.
 */
interface IBanUserArgs {
  /** The user to ban. */
  userId: string
}

/**
 * Toggles a user's ban status.
 * 
 * @param root Unused.
 * @param args The arguments for the ban. See {@link IBanUserArgs}.
 * 
 * @returns A promise that resolves to the banned user.
 * 
 * @throws Throws an error if the target user does not exist.
 * @throws Throws an error if the user is not an admin.
 */
async function banUser(root: undefined, args: IBanUserArgs, context: Context): Promise<IUser> {
  const userCheck = context.user && await permissions.checkAdminPermission(context.user.id);

  if(!userCheck) throw new BadSessionError("The current user is not a system administrator.");

  let user = await Users.findOne({_id: args.userId});

  if(user == undefined) {
    throw new Error('That user does not exist.');
  }

  user = await Users.findOneAndUpdate({_id: args.userId}, {$set: {banned: user.banned == true ? false : true}}, {new: false});

  return user;
}

/**
 * Gets the current user.
 * 
 * @param root Unused.
 * @param args Unused.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the current user.
 * 
 * @throws Throws an error if the user is not logged in.
 */
async function currentUser(root: undefined, args: undefined, context: Context): Promise<IUser> {
  if(context.user == null) throw new BadSessionError('You aren\'t logged in.');

  return Users.findOne({_id: context.user.id});
}

/**
 * Arguments for {@link user} and {@link adminUser}.
 */
interface IUserArgs {
  /** The user to get. */
  id: string
}

/**
 * Gets a user.
 * 
 * @param root Unused.
 * @param args The arguments used to get the user. See {@link IUserArgs}.
 * 
 * @returns A promise that resolves to the user.
 * 
 * @throws Throws an error if the user doesn't exist.
 */
async function user(root: undefined, args: IUserArgs): Promise<IUser> {
  const user = await Users.findOne({_id: args.id}).select(safeUserFields);

  if(user == undefined) throw new NotFoundError();

  return user;
}

/**
 * Gets a user.
 * 
 * @param root Unused.
 * @param args The arguments used to get the user.
 * @param context The current user context for the request.
 *
 * @returns A promise that resolves to the user.
 * 
 * @deprecated This function is deprecated. Use user() instead.
 * 
 * @throws Throws an error if the user is not an admin.
 */
async function adminUser(root: undefined, args: IUserArgs, context: Context): Promise<IUser> {
  const userCheck = context.user && await permissions.checkAdminPermission(context.user.id);

  if(!userCheck) throw new BadSessionError("The current user is not a system administrator.");

  const user = await Users.findOne({_id: args.id}).select(safeUserFields);

  if(user == undefined) throw new NotFoundError(); 

  return user;
}

/**
 * Arguments for {@link adminUsers}.
 */
interface IAdminUsersArgs {
  /** The start number of the range of planets to get. */
  startNumber: number,
  /** The amount of planets to get. */
  count: number,
}

/**
 * Gets a list of users.
 * 
 * @param root Unused.
 * @param args The arguments used to get the users. See {@link IAdminUsersArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the list of users.
 * 
 * @throws Throws an error if the user is not an admin.
 */
async function adminUsers(root: undefined, args: IAdminUsersArgs, context: Context): Promise<IUser[]> {
  if(!context.user || !(await permissions.checkAdminPermission(context.user.id))) throw new BadSessionError("The current user is not a system administrator.");

  return Users.find({}).sort({createdAt: -1}).skip(args.startNumber).limit(args.count); 
}

/**
 * Generates a user's TOTP secret. Used during the two-factor authentication set-up process.
 * 
 * @param root Unused.
 * @param args Unused.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the user's secret.
 * 
 * @throws Throws an error if the user is not logged in.
 */
async function generateTOTPSecret(root: undefined, args: undefined, context: Context): Promise<string> {
  if(!context.user) throw new BadSessionError();

  const secret = authenticator.generateSecret();
  const user = await Users.findOneAndUpdate({_id: context.user.id}, {$set: {tfaSecret: secret}});

  if(!user) throw new BadSessionError();
  return totp.keyuri(user.username, "Starship", secret);  
}

/**
 * Arguments for {@link confirmTFA} and {@link disableTFA}.
 */
interface ITFAArgs {
  /** The token from the authenticator. */
  token: number
}

/**
 * Confirms the set-up of two-factor authentication.
 * 
 * @param root Unused.
 * @param args The arguments used to confirm the set-up. See {@link ITFAArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to a set of backup codes.
 * 
 * @throws Throws an error if the token is invalid.
 * @throws Throws an error if the user isn't logged in.
 */
async function confirmTFA(root: undefined, args: ITFAArgs, context: Context): Promise<number[]> {
  if(!context.user) throw new BadSessionError();
  const user = await Users.findOne({_id: context.user.id});
  if(!user) throw new BadSessionError();
  if(!authenticator.check(String(args.token), user.tfaSecret)) throw new UserInputError("Invalid TFA token.");

  const backupCodes = [
    Crypto.randomInt(999999999), 
    Crypto.randomInt(999999999), 
    Crypto.randomInt(999999999), 
    Crypto.randomInt(999999999),
    Crypto.randomInt(999999999),
    Crypto.randomInt(999999999),
    Crypto.randomInt(999999999),
    Crypto.randomInt(999999999),
  ];
  await Users.findOneAndUpdate({_id: context.user.id}, {$set: {backupCodes, tfaEnabled: true}});
  return backupCodes; 
}

/**
 * Disables two-factor authentication.
 * 
 * @param root Unused.
 * @param args The arguments used to disable two-factor authentication. See {@link ITFAArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to true if the two-factor authentication was disabled.
 * 
 * @throws Throws an error if the user isn't logged in.
 * @throws Throws an error if two-factor authentication was already disabled.
 * @throws Throws an error if the token is invalid.
 */
async function disableTFA(root: undefined, args: ITFAArgs, context: Context): Promise<boolean> {
  if(!context.user) throw new BadSessionError();
  const user = await Users.findOne({_id: context.user.id});
  if(!user) throw new BadSessionError();
  if(!user.tfaEnabled) throw new UserInputError("Two-factor authentication is already disabled.");
  if(!authenticator.check(String(args.token), user.tfaSecret) && !user.backupCodes.includes(args.token)) throw new UserInputError("Invalid token or backup code.");
        
  await Users.findOneAndUpdate({_id: context.user.id}, {$set: {tfaEnabled: false}});
  return true;
}

/**
 * Arguments for {@link finalizeAuthorization}.
 */
interface IFinalizeAuthorizationArgs {
  /** The token issued by {@link loginUser}*/
  loginToken: string,
  /** The authentication token from the authenticator. */
  totpToken: number
}

/**
 * Finalizes the authorization process by verifying the two-factor authentication token.
 * 
 * @param root Unused.
 * @param args The arguments used to finalize the authorization process. See {@link IFinalizeAuthorizationArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to a finalized token.
 * 
 * @throws Throws an error if the two-factor authentication token is invalid.
 * @throws Throws an error if the unverified login token is invalid.
 */
async function finalizeAuthorization(root: undefined, args: IFinalizeAuthorizationArgs): Promise<{token: string, expectingTFA: boolean}> {
  const token = jwt.verify(args.loginToken, process.env.SECRET + "tfa") as {unverifiedId: string};
  if(!token) throw new UserInputError("Invalid login token.");

  const user = await Users.findOne({_id: token.unverifiedId});
  if(!user) throw new UserInputError("Invalid login token.");
  if(!authenticator.check(String(args.totpToken), user.tfaSecret) && !user.backupCodes.includes(args.totpToken)) throw new UserInputError("Invalid TFA token or backup code.");

  if(user.backupCodes.includes(args.totpToken)) {
    await Users.findOneAndUpdate({_id: user._id}, {$pull: {backupCodes: args.totpToken}});
  }
  return {token: jwt.sign({id: user._id, username: user.username, admin: user.admin}, process.env.SECRET), expectingTFA: false};
}

/**
 * Arguments for {@link updateProfileBio}.
 */
interface IUpdateProfileBioArgs {
  /** The new bio for the current user. */
  bio: string
}

/**
 * Updates the current user's profile bio.
 * 
 * @param root Unused.
 * @param args The arguments used to update the user's profile bio. See {@link IUpdateProfileBioArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the updated user.
 * 
 * @throws Throws an error if the user is not logged in.
 * @throws Throws an error if the bio is too long.
 */
async function updateProfileBio(root: undefined, args: IUpdateProfileBioArgs, context: Context): Promise<IUser> {
  if(!context.user) throw new BadSessionError();
  if(args.bio.length > 2000) throw new UserInputError("Your bio is too long, it must be at most 2000 characters.");

  return Users.findOneAndUpdate({_id: context.user.id}, {$set: {profileBio: args.bio}}, {new: true});
}

/**
 * Arguments for {@link toggleBlockUser}.
 */
interface IToggleBlockUserArgs {
  /** The user to block. */
  userId: string
}

/**
 * Toggles whether a user is blocked.
 * 
 * @param root Unused.
 * @param args The arguments used to toggle whether a user is blocked. See {@link IToggleBlockUserArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the updated user.
 * 
 * @throws Throws an error if the user is not logged in.
 * @throws Throws an error if you try to block yourself.
 * @throws Throws an error if the user is not found.
 */
async function toggleBlockUser(root: undefined, args: IToggleBlockUserArgs, context: Context): Promise<IUser> {
  if(!context.user) throw new BadSessionError();
  if(context.user.id == args.userId) throw new UserInputError("You can't block yourself.");

  const user = await Users.findOne({_id: context.user.id}); 
  if(!user) throw new BadSessionError();

  if(user.blocked && user.blocked.includes(args.userId)) {
    return Users.findOneAndUpdate({_id: context.user.id}, {$pull: {blocked: args.userId}}, {new: true});
  } else {
    return Users.findOneAndUpdate({_id: context.user.id}, {$push: {blocked: args.userId}}, {new: true});
  } 
}

/**
 * Arguments for {@link setNotificationSetting}.
 */
interface ISetNotificationSettingArgs {
  /** The notification. See {@link MentionSettings} for the possible values. */
  option: number
}

/**
 * Sets a user's notification setting.
 * 
 * @param root Unused.
 * @param args The arguments used to set the user's notification setting. See {@link ISetNotificationSettingArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the updated user.
 * 
 * @throws Throws an error if the user is not logged in.
 * @throws Throws an error if the mention notification setting is not valid.
 */
async function setNotificationSetting(root: undefined, args: ISetNotificationSettingArgs, context: Context): Promise<IUser> {
  if(context.user) throw new BadSessionError();
  if(Object.values(MentionSettings).includes(args.option)) throw new UserInputError("Invalid notification settings");
  
  return Users.findOneAndUpdate({_id: context.user.id}, {notificationSetting: args.option}); 
}

export default {fieldResolvers, setNotificationSetting, toggleBlockUser, updateProfileBio, finalizeAuthorization, disableTFA, confirmTFA, generateTOTPSecret, resetPassword, activateEmail, resendVerificationEmail, loginUser, currentUser, insertUser, user, adminUser, banUser, adminUsers, sendResetPasswordEmail};
