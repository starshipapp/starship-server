import Users, { IUser } from "../database/Users";
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

const fieldResolvers = {
  following: async (root: IUser, args: undefined, context: Context): Promise<IPlanet[]> => {
    if(root._id == context.user.id) {
      const loaded = await context.loaders.planetLoader.loadMany(root.following);
      return loaded as IPlanet[];
    }
    throw new Error("You can only get the followed planets on the active user.");
  },
  memberOf: async (root: IUser, args: undefined, context: Context): Promise<IPlanet[]> => {
    if(root._id == context.user.id) {
      const loaded = await Planets.find({
        $or: [
          {owner: context.user.id},
          {members: context.user.id}
        ]
      });
      return loaded;
    }
    throw new Error("You can only get the member planets of the active user.");
  }
};

interface IInsertUserArgs {
  email: string,
  password: string,
  username: string,
  recaptcha: string
}

async function insertUser(root: undefined, args: IInsertUserArgs): Promise<IUser> {
  const usernameCheck = await Users.findOne({username: args.username});
  const emailCheck = await Users.findOne({emails: {$elemMatch: {address: args.email}}});

  if(usernameCheck != undefined) {
    throw new Error('That username is taken.');
  }

  if(emailCheck != undefined) {
    throw new Error('That email is taken.');
  }

  if(args.password.length < 8) {
    throw new Error('Your password needs to be at least 8 characters long.');
  }

  const secret = process.env.RECAPTCHA_SECRET;
  const response = args.recaptcha;

  let shouldContinue = true;

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

    if(res) {
      if(res.data) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if(res.data.success && res.data.success == true) {
          shouldContinue = true;
        } else {
          throw new Error("Invalid captcha.");
        }
      } else {
        throw new Error("Failed to verfiy captcha");
      }
    } else {
      throw new Error("Failed to verfiy captcha");
    }
  }

  if(shouldContinue) {
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
    await sendVerificationEmail(user);
    return user;
  }
}

interface ILoginUserArgs {
  username: string,
  password: string,
}

async function loginUser(root: undefined, args: ILoginUserArgs): Promise<{token: string, expectingTFA: boolean}> {
  const document = await Users.findOne({username: args.username}).catch((error) => {Loggers.mainLogger.error(error);}) as unknown as IUser;
  if(document == undefined) {
    throw new Error('Incorrect username or password.');
  }
  if(process.env.SMTP_HOST) {
    if(document.emails.filter((value) => {return value.verified == true;}).length < 1) {
      throw new Error('You need to verify your email.');
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if(bcrypt.compareSync(args.password, document.services.password.bcrypt)) {
    if(!document.tfaEnabled) {
      return {token: jwt.sign({id: document._id, username: document.username, admin: document.admin}, process.env.SECRET), expectingTFA: false};
    } else {
      return {token: jwt.sign({unverifiedId: document._id}, process.env.SECRET + "tfa"), expectingTFA: true};
    }
  } else {
    throw new Error('Incorrect username or password.');
  }
}

interface IActivateEmailArgs {
  userId: string,
  token: string
}

async function activateEmail(root: undefined, args: IActivateEmailArgs): Promise<boolean> {
  const document = await Users.findOne({_id: args.userId});
  if(document) {
    const emails = document.emails.filter((value) => {return value.verificationToken == args.token;});
    if(emails.length != 0) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      await Users.findOneAndUpdate({_id: document._id, emails: {$elemMatch: {verificationToken: args.token}}}, {$set: {"emails.$.verificationToken": v4(), "emails.$.verified": true}}, {new: true});
      return true;
    } else {
      throw new Error("Invalid token");
    }
  } else {
    throw new Error("User not found.");
  }
}

interface IResetPasswordArgs {
  userId: string,
  token: string,
  password: string
}

async function resetPassword(root: undefined, args: IResetPasswordArgs): Promise<boolean> {
  const document = await Users.findOne({_id: args.userId});
  if(document) {
    if(document.services.password.resetExpiry && document.services.password.resetToken) {
      if(document.services.password.resetToken == args.token) {
        if(document.services.password.resetExpiry.getTime() > Date.now()) {
          const newPassword = bcrypt.hashSync(args.password, 3);
          await Users.findOneAndUpdate({_id: document._id}, {$set: {services: {password: {bcrypt: newPassword, resetExpiry: new Date(Date.now()), resetToken: v4()}}}}, {new: true});
          return true;
        }
      } else {
        throw new Error("Invalid token");
      }
    } else {
      throw new Error("Invalid token");
    }
  } else {
    throw new Error("User not found.");
  }
}

interface IResendVerificationEmailArgs {
  username: string
}

async function resendVerificationEmail(root: undefined, args: IResendVerificationEmailArgs): Promise<boolean> {
  const document = await Users.findOne({username: args.username});
  if(document == undefined) {
    throw new Error("User not found.");
  } else {
    if(document.emails.filter((value) => {return !value.verified;}).length < 1) {
      throw new Error('Your email is already verified!');
    } else {
      return sendVerificationEmail(document);
    }
  }
}

interface ISendResetPasswordEmail {
  username: string
}

async function sendResetPasswordEmail(root: undefined, args: ISendResetPasswordEmail): Promise<boolean> {
  const document = await Users.findOne({username: args.username});
  if(document == undefined) {
    throw new Error("User not found.");
  } else {
    return sendForgotPasswordEmail(document);
  }
}

interface IBanUserArgs {
  userId: string
}

async function banUser(root: undefined, args: IBanUserArgs, context: Context): Promise<IUser> {
  const userCheck = context.user && await permissions.checkAdminPermission(context.user.id);

  if(userCheck) {
    let user = await Users.findOne({_id: args.userId});

    if(user == undefined) {
      throw new Error('That user does not exist.');
    }

    user = await Users.findOneAndUpdate({_id: args.userId}, {$set: {banned: user.banned == true ? false : true}}, {new: false});

    return user;
  } else {
    throw new Error('You don\'t have permission to do that.');
  }
}

async function currentUser(root: undefined, args: undefined, context: Context): Promise<IUser> {
  if(context.user == null) {
    throw new Error('You aren\'t logged in.');
  }

  return Users.findOne({_id: context.user.id});
}

interface IUserArgs {
  id: string
}

async function user(root: undefined, args: IUserArgs): Promise<IUser> {
  const user = await Users.findOne({_id: args.id});

  if(user == undefined) {
    throw new Error('That user does not exist.');
  }

  return {
    id: user._id,
    username: user.username,
    admin: user.admin,
    createdAt: user.createdAt,
    banned: user.banned,
    profilePicture: user.profilePicture
  } as IUser;
}

async function adminUser(root: undefined, args: IUserArgs, context: Context): Promise<IUser> {
  const userCheck = context.user && await permissions.checkAdminPermission(context.user.id);

  if(userCheck) {
    const user = await Users.findOne({_id: args.id});

    if(user == undefined) {
      throw new Error('That user does not exist.');
    }

    return {
      _id: user._id,
      username: user.username,
      admin: user.admin,
      createdAt: user.createdAt,
      banned: user.banned,
      profilePicture: user.profilePicture,
      following: user.following
    } as IUser;
  } else {
    throw new Error('You don\'t have permission to do that.');
  }
}

interface IAdminUsersArgs {
  startNumber: number,
  count: number,
}

async function adminUsers(root: undefined, args: IAdminUsersArgs, context: Context): Promise<IUser[]> {
  if(context.user && await permissions.checkAdminPermission(context.user.id)) {
    return Users.find({}).sort({createdAt: -1}).skip(args.startNumber).limit(args.count);
  } else {
    throw new Error('You don\'t have permission to do that.');
  }
}

async function generateTOTPSecret(root: undefined, args: undefined, context: Context): Promise<string> {
  if(context.user) {
    const secret = authenticator.generateSecret();
    const user = await Users.findOneAndUpdate({_id: context.user.id}, {$set: {tfaSecret: secret}});
    if(user) {
      return totp.keyuri(user.username, "Starship", secret); 
    } else {
      throw new Error("Not logged in.");
    }
  } else {
    throw new Error("Not logged in.");
  }
}

interface ITFAArgs {
  token: number
}

async function confirmTFA(root: undefined, args: ITFAArgs, context: Context): Promise<number[]> {
  if(context.user) {
    const user = await Users.findOne({_id: context.user.id});
    if(user) {
      if(authenticator.check(String(args.token), user.tfaSecret)) {
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
      } else {
        throw new Error("Invalid token.");
      }
    } else {
      throw new Error("Not logged in.");
    }
  } else {
    throw new Error("Not logged in.");
  }
}

async function disableTFA(root: undefined, args: ITFAArgs, context: Context): Promise<boolean> {
  if(context.user) {
    const user = await Users.findOne({_id: context.user.id});
    if(user) {
      if(authenticator.check(String(args.token), user.tfaSecret) || user.backupCodes.includes(args.token)) {
        await Users.findOneAndUpdate({_id: context.user.id}, {$set: {tfaEnabled: false}});
        return true;
      } else {
        throw new Error("Invalid token or backup code.");
      }
    } else {
      throw new Error("Not logged in.");
    }
  } else {
    throw new Error("Not logged in.");
  }
}

interface IFinalizeAuthorizationArgs {
  loginToken: string,
  totpToken: number
}

async function finalizeAuthorization(root: undefined, args: IFinalizeAuthorizationArgs): Promise<{token: string, expectingTFA: boolean}> {
  const token = jwt.verify(args.loginToken, process.env.SECRET + "tfa") as {unverifiedId: string};
  if(token) {
    const user = await Users.findOne({_id: token.unverifiedId});
    if(user) {
      if(authenticator.check(String(args.totpToken), user.tfaSecret) || user.backupCodes.includes(args.totpToken)) {
        if(user.backupCodes.includes(args.totpToken)) {
          await Users.findOneAndUpdate({_id: user._id}, {$pull: {backupCodes: args.totpToken}});
        }
        return {token: jwt.sign({id: user._id, username: user.username, admin: user.admin}, process.env.SECRET), expectingTFA: false};
      } else {
        throw new Error("Invalid token or backup code.");
      }
    } else {
      throw new Error("Not logged in.");
    }
  }
}

interface IUpdateProfileBioArgs {
  bio: string
}

async function updateProfileBio(root: undefined, args: IUpdateProfileBioArgs, context: Context): Promise<IUser> {
  if(!context.user) {
    throw new Error("Not logged in.");
  }

  if(args.bio.length > 2000) {
    throw new Error("Your bio is too long, it must be at most 2000 characters.");
  }

  return Users.findOneAndUpdate({_id: context.user.id}, {$set: {profileBio: args.bio}}, {new: true});
}

export default {fieldResolvers, updateProfileBio, finalizeAuthorization, disableTFA, confirmTFA, generateTOTPSecret, resetPassword, activateEmail, resendVerificationEmail, loginUser, currentUser, insertUser, user, adminUser, banUser, adminUsers, sendResetPasswordEmail};