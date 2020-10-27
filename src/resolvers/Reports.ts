const Reports = require('../database/Reports');
const permissions = require('../permissions');

async function report(root, args, context) {
  const userCheck = context.user && await permissions.checkAdminPermission(context.user.id)

  if(userCheck) {
    return Reports.Reports.findOne({_id: args.id});
  } else {
    throw new Error('not-admin')
  }
}

async function allReports(root, args, context) {
  const userCheck = context.user && await permissions.checkAdminPermission(context.user.id)

  if(userCheck) {
    if((args.count) < 101) {
      return Reports.Reports.find({}).sort({createdAt: -1}).skip(args.startNumber).limit(args.count);
    } else {
      throw new Error('page-too-large');
    }
  } else {
    throw new Error('not-admin')
  }
}

async function reportsByUser(root, args, context) {
  const userCheck = context.user && await permissions.checkAdminPermission(context.user.id)

  if(userCheck) {
    if((args.count) < 101) {
      return Reports.Reports.find({userId: args.userId,}).sort({createdAt: -1}).skip(args.startNumber).limit(args.count);
    } else {
      throw new Error('page-too-large');
    }
  } else {
    throw new Error('not-admin')
  }
}

async function insertReport(root, args, context) {
  if(context.user && context.user.id) {
    console.log(args);
    const newReport = new Reports.Reports({
      owner: context.user.id,
      createdAt: new Date(),
      objectType: args.objectType,
      objectId: args.objectId,
      reportType: args.reportType,
      details: args.details,
      userId: args.userId,
      solved: false
    })

    const result = await newReport.save().catch((e) => {console.error(e)});
    return result;
  } else {
    throw new Error("no-user")
  }
}

async function solveReport(root, args, context) {
  const userCheck = context.user && await permissions.checkAdminPermission(context.user.id)

  if(userCheck) {
    return await Reports.Reports.findOneAndUpdate({_id: args.reportId}, {$set: {solved: true}}, {returnOriginal: false})
  } else {
    throw new Error('not-admin')
  }
}

export {report, allReports, reportsByUser, insertReport, solveReport}