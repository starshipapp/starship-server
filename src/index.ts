import dotenv from "dotenv";
dotenv.config();

import { ApolloServer, gql } from "apollo-server-express";
import { readFileSync } from "fs";
import express from "express";
import Loggers from "./Loggers";
import jwt from "jsonwebtoken";

Loggers.mainLogger.info("Starting starship-server");
Loggers.mainLogger.warn("PRE-ALPHA BUILD; DO NOT USE IN PRODUCTION");

import resolvers from "./resolvers/resolvers";
import { connect } from "mongoose";
import IUserToken from "./util/IUserToken";
import Context from "./util/Context";
import Loaders from "./util/Loaders";
import https from "https";

const sysInfo = {
  serverName: "starship-server",
  version: "prealpha (0.5)",
  schemaVersion: "0.5a",
  supportedFeatures: ["users", "reports", "planets", "invites"],
  supportedComponents: ["pages", "wikis", "forums", "files"],
  clientFlags: ["+experimental"]
};

// update client flags
if(!process.env.BUCKET_ENDPOINT) {
  sysInfo.clientFlags.push("-upload");
}

if(!process.env.RECAPTCHA_SECRET) {
  sysInfo.clientFlags.push("-recaptcha");
}

if(!process.env.REDIS_URL) {
  sysInfo.clientFlags.push("+lowcapacity");
}

if(!process.env.SMTP_HOST) {
  sysInfo.clientFlags.push("-emailverify");
}

if(!process.env.DEVELOPMENT) {
  sysInfo.clientFlags.push("+development");
}

if(!process.env.SSL_PRIVATE_PATH) {
  sysInfo.clientFlags.push("-secure");
}

connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true
}).then(() => {
  Loggers.dbLogger.info("Connected to database sucessfully");
    Loggers.dbLogger.info("Setting up DB schema");
    require('./database/database');
    Loggers.apolloLogger.info("Starting Apollo");
    const app = express();
    if(!process.env.REDIS_URL) {
      Loggers.mainLogger.warn("RUNNING IN DEVELOPMENT MODE, NOT USING REDIS");
    }
    Loggers.apolloLogger.info("Verifying schema integrity");
    const schema = readFileSync('dist/starship-schema/schema.graphql', 'utf8');
    if(!schema.startsWith("# starship-schema ")) {
      Loggers.apolloLogger.fatal("Invalid schema header. Expected '# starship-schema (version)', got '" + schema.split("\n")[0] + "'.");
      Loggers.mainLogger.fatal("Exiting...");
      process.exit(3);
    }
    if(!schema.startsWith("# starship-schema " + sysInfo.schemaVersion)) {
      Loggers.apolloLogger.fatal("Server schema version mismatch. Verify that schema.graphql is the correct version.");
      Loggers.apolloLogger.debug("sysInfo.schemaVersion: " + sysInfo.schemaVersion);
      Loggers.apolloLogger.debug("schema.graphql version: " + schema.split("\n")[0].split("starship-schema ")[1]);
      Loggers.mainLogger.fatal("Exiting...");
      process.exit(2);
    }
    const typeDefs = gql`${schema}`;
    const server = new ApolloServer({
      typeDefs,
      resolvers,
      context: ({req}) => {
        let user: IUserToken = null;

        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        if (req.headers.authorization !== undefined && req.headers.authorization.includes("Bearer")) {
          const token = req.headers.authorization.replace('Bearer ', '');
          user = jwt.verify(token, process.env.SECRET) as IUserToken;
          if(user.id == undefined) {
            user = null;
          }
        }

        const ctx = new Context();
        
        ctx.user = user;
        ctx.loaders = new Loaders();

        return ctx;
      },
      tracing: Boolean(process.env.DEVELOPMENT)
    });

    server.applyMiddleware({ app });

    app.get('/', (req, res) => {
      res.json(sysInfo);
    });

    if(!process.env.SSL_PRIVATE_PATH) {
      app.listen({ port: Number(process.env.PORT) }, () =>
        Loggers.apolloLogger.info(`Server up at http://localhost:${process.env.PORT}${server.graphqlPath}`)
      );
    } else {
      Loggers.httpsLogger.info(`Starting HTTPS server`);
      Loggers.httpsLogger.info(`Loading certificate information`);
      const cert = readFileSync(process.env.SSL_CERTIFICATE_PATH);
      const key = readFileSync(process.env.SSL_PRIVATE_PATH);
      const options: https.ServerOptions = {
        cert,
        key
      };
      if(process.env.SSL_CA_PATH) {
        options.ca = readFileSync(process.env.SSL_CA_PATH);
      }

      Loggers.httpsLogger.info(`Creating server`);
      const httpsServer = https.createServer(options, app);

      httpsServer.listen(process.env.HTTPS_PORT, function() {
        Loggers.httpsLogger.info(`Server up at http://localhost:${process.env.HTTPS_PORT}${server.graphqlPath}`);
      });
    }
}).catch((error) => {
  Loggers.dbLogger.error(error);
  Loggers.mainLogger.fatal("Exiting...");
  process.exit(1);
});