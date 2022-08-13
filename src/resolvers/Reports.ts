import Reports, { IReport } from '../database/Reports';
import { IUser } from '../database/Users';
import { BadSessionError } from '../util/BadSessionError';
import Context from '../util/Context';
import permissions from '../util/permissions';

/**
 * Resolvers for the fields of the GraphQL type.
 */
const fieldResolvers = {
  owner: async (root: IReport, args: undefined, context: Context): Promise<IUser> => {
    return context.loaders.userLoader.load(root.owner);
  },
  user: async (root: IReport, args: undefined, context: Context): Promise<IUser> => {
    return context.loaders.userLoader.load(root.userId);
  }
};

/**
 * Arguments for {@link report}.
 */
interface IReportArgs {
  /** The ID of the report. */
  id: string
}

/**
 * Gets a single report.
 * 
 * @param root Unused.
 * @param args The arguments used to get the report. See {@link IReportArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the report.
 * 
 * @throws Throws an error if the user is not an admin.
 */
async function report(root: undefined, args: IReportArgs, context: Context): Promise<IReport> {
  if(!context.user || !(await permissions.checkAdminPermission(context.user.id))) throw new BadSessionError("The current user is not a system administrator.");
  
  return Reports.findOne({_id: args.id});
}

/**
 * Arguments for {@link reportsByUser}.
 */
interface IAllReportsArgs {
  /** The start number of the range of reports to get. */
  startNumber: number,
  /** The number of reports to get. */
  count: number,
}

/**
 * Gets all reports in a range.
 * 
 * @param root Unused.
 * @param args The arguments used to get the reports. See {@link IAllReportsArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the reports.
 * 
 * @throws Throws an error if the user is not an admin.
 * @throws Throws an error if the count is > 100.
 */
async function allReports(root: undefined, args: IAllReportsArgs, context: Context): Promise<IReport[]> {
  const userCheck = context.user && await permissions.checkAdminPermission(context.user.id);

  if(userCheck) {
    if((args.count) < 101) {
      return Reports.find({}).sort({createdAt: -1}).skip(args.startNumber).limit(args.count);
    } else {
      throw new Error("Count is too large. Maximum is 100.");
    }
  } else {
    throw new Error("You are not a global moderator.");
  }
}

/**
 * Arguments for {@link reportsByUser}.
 */
interface IReportsByUserArgs extends IAllReportsArgs {
  /** The ID of the user to get reports for. */
  userId: string
}

/**
 * Gets all the reports for a user.
 * 
 * @param root Unused.
 * @param args The arguments used to get the reports.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the reports.
 * 
 * @throws Throws an error if the user is not an admin.
 * @throws Throws an error if the count is > 100.
 */
async function reportsByUser(root: undefined, args: IReportsByUserArgs, context: Context): Promise<IReport[]> {
  const userCheck = context.user && await permissions.checkAdminPermission(context.user.id);

  if(userCheck) {
    if((args.count) < 101) {
      return Reports.find({userId: args.userId,}).sort({createdAt: -1}).skip(args.startNumber).limit(args.count);
    } else {
      throw new Error("Count is too large. Maximum is 100.");
    }
  } else {
    throw new Error("You are not a global moderator.");
  }
}

/**
 * Arguments for {@link insertReport}.
 */
interface IInsertReportArgs {
  /** The type of the object being reported. */
  objectType: number,
  /** The ID of the object being reported. */
  objectId: string,
  /** The type of the report. */
  reportType: number,
  /** The details of the report. */
  details: string,
  /** The ID of the user reporting the object. */
  userId: string
}

/**
 * Submits a new report.
 * 
 * @param root Unused.
 * @param args The arguments used to submit the report. See {@link IInsertReportArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the new report.
 * 
 * @throws Throws an error if the user is not logged in.
 */
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
    throw new Error("Not logged in.");
  }
}

/**
 * Arguments for {@link solveReport}.
 */
interface ISolveReportArgs {
  /** The ID of the report to solve. */
  reportId: string
}

/**
 * Marks a report as solved.
 * 
 * @param root Unused.
 * @param args The arguments used to mark the report as solved. See {@link ISolveReportArgs}.
 * @param context The current user context for the request.
 * 
 * @returns A promise that resolves to the solved report.
 * 
 * @throws Throws an error if the user is not an admin.
 */
async function solveReport(root: undefined, args: ISolveReportArgs, context:Context): Promise<IReport> {
  const userCheck = context.user && await permissions.checkAdminPermission(context.user.id);

  if(userCheck) {
    return await Reports.findOneAndUpdate({_id: args.reportId}, {$set: {solved: true}}, {new: true});
  } else {
    throw new Error("You are not a global moderator.");
  }
}

export default {fieldResolvers, report, allReports, reportsByUser, insertReport, solveReport};
