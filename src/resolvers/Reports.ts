import Reports, { IReport } from '../database/Reports';
import { IUser } from '../database/Users';
import Context from '../util/Context';
import permissions from '../util/permissions';

const fieldResolvers = {
  owner: async (root: IReport, args: undefined, context: Context): Promise<IUser> => {
    return context.loaders.userLoader.load(root.owner);
  },
  user: async (root: IReport, args: undefined, context: Context): Promise<IUser> => {
    return context.loaders.userLoader.load(root.userId);
  }
};

interface IReportArgs {
  id: string
}

async function report(root: undefined, args: IReportArgs, context: Context): Promise<IReport> {
  const userCheck = context.user && await permissions.checkAdminPermission(context.user.id);

  if(userCheck) {
    return Reports.findOne({_id: args.id});
  } else {
    throw new Error('not-admin');
  }
}

interface IAllReportsArgs {
  startNumber: number,
  count: number,
}

async function allReports(root: undefined, args: IAllReportsArgs, context: Context): Promise<IReport[]> {
  const userCheck = context.user && await permissions.checkAdminPermission(context.user.id);

  if(userCheck) {
    if((args.count) < 101) {
      return Reports.find({}).sort({createdAt: -1}).skip(args.startNumber).limit(args.count);
    } else {
      throw new Error('page-too-large');
    }
  } else {
    throw new Error('not-admin');
  }
}

interface IReportsByUserArgs extends IAllReportsArgs {
  userId: string
}

async function reportsByUser(root: undefined, args: IReportsByUserArgs, context: Context): Promise<IReport[]> {
  const userCheck = context.user && await permissions.checkAdminPermission(context.user.id);

  if(userCheck) {
    if((args.count) < 101) {
      return Reports.find({userId: args.userId,}).sort({createdAt: -1}).skip(args.startNumber).limit(args.count);
    } else {
      throw new Error('page-too-large');
    }
  } else {
    throw new Error('not-admin');
  }
}

interface IInsertReportArgs {
  objectType: number,
  objectId: string,
  reportType: number,
  details: string,
  userId: string
}

async function insertReport(root: undefined, args: IInsertReportArgs, context: Context): Promise<IReport> {
  if(context.user && context.user.id) {
    const newReport = new Reports({
      owner: context.user.id,
      createdAt: new Date(),
      objectType: args.objectType,
      objectId: args.objectId,
      reportType: args.reportType,
      details: args.details,
      userId: args.userId,
      solved: false
    });

    const result = await newReport.save().catch((e) => {console.error(e);}) as unknown as IReport;
    return result;
  } else {
    throw new Error("no-user");
  }
}

interface ISolveReportArgs {
  reportId: string
}

async function solveReport(root: undefined, args: ISolveReportArgs, context:Context): Promise<IReport> {
  const userCheck = context.user && await permissions.checkAdminPermission(context.user.id);

  if(userCheck) {
    return await Reports.findOneAndUpdate({_id: args.reportId}, {$set: {solved: true}}, {new: true});
  } else {
    throw new Error('not-admin');
  }
}

export default {fieldResolvers, report, allReports, reportsByUser, insertReport, solveReport};