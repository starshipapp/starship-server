const logger = require('log4js');

const mainLogger = logger.getLogger("main");
const dbLogger = logger.getLogger("database");
const apolloLogger = logger.getLogger("apollo");
mainLogger.level = "debug";
dbLogger.level = "debug";
apolloLogger.level = "debug";

export {mainLogger, dbLogger, apolloLogger}