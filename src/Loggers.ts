import {Logger, getLogger} from "log4js";

export default class Loggers {
  static mainLogger: Logger = getLogger("main");
  static dbLogger: Logger = getLogger("database");
  static apolloLogger: Logger = getLogger("apollo");
  static awsLogger: Logger = getLogger("aws");
  static httpsLogger: Logger = getLogger("https");
}

Loggers.awsLogger.level = "debug";
Loggers.mainLogger.level = "debug";
Loggers.dbLogger.level = "debug";
Loggers.apolloLogger.level = "debug";
Loggers.httpsLogger.level = "debug";