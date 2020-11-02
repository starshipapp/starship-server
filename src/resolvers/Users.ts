import Users, { IUser } from "../database/Users";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import permissions from "../util/permissions";
import IContext from "../util/IContext";

interface IInsertUserArgs {
  email: string,
  password: string,
  username: string,
  recaptcha: string
}

async function insertUser(root, args: IInsertUserArgs, context): Promise<IUser> {
  const usernameCheck = await Users.findOne({username: args.username});
  const emailCheck = await Users.findOne({emails: {$elemMatch: {address: args.email}}});

  if(usernameCheck != undefined) {
    throw new Error('username-used');
  }

  if(emailCheck != undefined) {
    throw new Error('email-used');
  }

  if(args.password.length < 8) {
    throw new Error('password-length');
  }

  // don't do anything with RECAPTCHA yet, needs client
  const secret = process.env.RECAPTCHASECRET;
  const response = args.recaptcha;

  const password = bcrypt.hashSync(args.password, 3) ;

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

  return await newUser.save().catch((e) => {console.error(e);}) as IUser;
}

interface ILoginUserArgs {
  username: string,
  password: string,
}

async function loginUser(root, args: ILoginUserArgs, context): Promise<{token: string}> {
  const document = await Users.findOne({username: args.username}).catch((err) => {/* log the error*/}) as unknown as IUser;
  if(document == undefined) {
    throw new Error('missing-user');
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if(bcrypt.compareSync(args.password, document.services.password.bcrypt)) {
    return {token: jwt.sign({id: document._id, username: document.username, admin: document.admin}, process.env.SECRET)};
  }
}

interface IBanUserArgs {
  userId: string
}

async function banUser(root, args: IBanUserArgs, context: IContext): Promise<IUser> {
  const userCheck = context.user && await permissions.checkAdminPermission(context.user.id);

  if(userCheck) {
    let user = await Users.findOne({_id: args.userId});

    if(user == undefined) {
      throw new Error('no-user');
    }

    user = await Users.findOneAndUpdate({_id: args.userId}, {$set: {banned: user.banned == true ? false : true}}, {new: false});

    return user;
  } else {
    throw new Error('not-admin');
  }
}

async function currentUser(root, args, context: IContext): Promise<IUser> {
  if(context.user == null) {
    throw new Error('no-login');
  }

  return Users.findOne({_id: context.user.id});
}

interface IUserArgs {
  id: string
}

async function user(root, args: IUserArgs, context): Promise<IUser> {
  const user = await Users.findOne({_id: args.id});

  if(user == undefined) {
    throw new Error('no-user');
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

async function adminUser(root, args: IUserArgs, context: IContext): Promise<IUser> {
  const userCheck = context.user && await permissions.checkAdminPermission(context.user.id);

  if(userCheck) {
    const user = await Users.findOne({_id: args.id});

    if(user == undefined) {
      throw new Error('no-user');
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
    throw new Error('not-admin');
  }
}

async function adminUsersRecent(root, args, context: IContext) {
  const userCheck = context.user && await permissions.checkAdminPermission(context.user.id);

  if(userCheck) {

    if(user == undefined) {
      throw new Error('no-user');
    }

    return Users.find({}, {sort: { createdAt: -1 }, limit: 15});
  } else {
    throw new Error('not-admin');
  }
}

export default {loginUser, currentUser, insertUser, user, adminUser, banUser, adminUsersRecent};