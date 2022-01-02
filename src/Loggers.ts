import {Logger, getLogger} from "log4js";

/**
 * Object storing the loggers for global use.
 */
export default class Loggers {
  static mainLogger: Logger = getLogger("main");
  static dbLogger: Logger = getLogger("database");
  static apolloLogger: Logger = getLogger("apollo");
  static awsLogger: Logger = getLogger("aws");
  static httpsLogger: Logger = getLogger("https");
  static debugLogger: Logger = getLogger("debug");
}

Loggers.awsLogger.level = "info";
Loggers.mainLogger.level = "info";
Loggers.dbLogger.level = "info";
Loggers.apolloLogger.level = "info";
Loggers.httpsLogger.level = "info";
Loggers.debugLogger.level = "debug";