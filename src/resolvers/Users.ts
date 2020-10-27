const Users = require('../database/Users');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const permissions = require('../permissions');

async function insertUser(root, args, context) {
  const usernameCheck = await Users.Users.findOne({username: args.username});
  const emailCheck = await Users.Users.findOne({emails: {$elemMatch: {address: args.email}}})

  if(usernameCheck != undefined) {
    throw new Error('username-used')
  }

  if(emailCheck != undefined) {
    throw new Error('email-used');
  }

  if(args.password.length < 8) {
    throw new Error('password-length');
  }

  //don't do anything with RECAPTCHA yet, needs client
  const secret = process.env.RECAPTCHASECRET;
  const response = args.recaptcha;

  const password = bcrypt.hashSync(args.password, 3);

  const user = new Users.Users({
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

  return await user.save().catch((e) => {console.error(e)});
}

async function loginUser(root, args, context) {
  const document = await Users.Users.findOne({username: args.username}).catch((err) => {/*log the error*/})
  if(document == undefined) {
    throw new Error('missing-user')
  }
  if(bcrypt.compareSync(args.password, document.services.password.bcrypt)) {
    return {token: jwt.sign({id: document._id, username: document.username, admin: document.admin}, process.env.SECRET)};
  }
}

async function banUser(root, args, context) {
  const userCheck = context.user && await permissions.checkAdminPermission(context.user.id)

  if(userCheck) {
    let user = await Users.Users.findOne({_id: args.userId})

    if(user == undefined) {
      throw new Error('no-user')
    }  

    user = await Users.Users.findOneAndUpdate({_id: args.userId}, {$set: {banned: user.banned == true ? false : true}}, {returnOriginal: false});

    return user
  } else {
    throw new Error('not-admin')
  }
}

async function currentUser(root, args, context) {
  if(context.user == null) {
    throw new Error('no-login');
  }

  return Users.Users.findOne({_id: context.user.id})
}

async function user(root, args, context) {
  const user = await Users.Users.findOne({_id: args.id})

  if(user == undefined) {
    throw new Error('no-user')
  }

  return {
    username: user.username,
    admin: user.admin,
    createdAt: user.createdAt,
    banned: user.banned,
    profilePicture: user.profilePicture
  }
}

async function adminUser(root, args, context) {
  const userCheck = context.user && await permissions.checkAdminPermission(context.user.id)

  if(userCheck) {
    const user = await Users.Users.findOne({_id: args.id})

    if(user == undefined) {
      throw new Error('no-user')
    }  

    return {
      username: user.username,
      admin: user.admin,
      createdAt: user.createdAt,
      banned: user.banned,
      profilePicture: user.profilePicture,
      following: user.following
    }
  } else {
    throw new Error('not-admin')
  }
}

async function adminUsersRecent(root, args, context) {
  const userCheck = context.user && await permissions.checkAdminPermission(context.user.id)

  if(userCheck) {

    if(user == undefined) {
      throw new Error('no-user')
    }  

    return Users.Users.find({}, {sort: { createdAt: -1 }, limit: 15});
  } else {
    throw new Error('not-admin')
  }
}

export {loginUser, currentUser, insertUser, user, adminUser, banUser, adminUsersRecent}