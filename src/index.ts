import dotenv from "dotenv";
dotenv.config();

import { ApolloServer, gql } from "apollo-server-express";
import { readFileSync } from "fs";
import express from "express";
import Loggers from "./Loggers";
import jwt from "jsonwebtoken";

Loggers.mainLogger.info("Starting starship-server");

import resolvers from "./resolvers/resolvers";
import { connect } from "mongoose";
import IUserToken from "./util/IUserToken";
import Context from "./util/Context";
import Loaders from "./util/Loaders";
import https from "https";
import { RedisCache } from "apollo-server-cache-redis";
import yn from "yn";
import fs from "fs";

const sysInfo = {
  serverName: "starship-server",
  version: "prealpha (0.8-wip)",
  schemaVersion: "0.8",
  supportedFeatures: ["users", "reports", "planets", "invites"],
  supportedComponents: ["pages", "wikis", "forums", "files"],
  clientFlags: []
};

// update client flags
if(!process.env.BUCKET_ENDPOINT) {
  sysInfo.clientFlags.push("-upload");
}

if(!process.env.RECAPTCHA_SECRET) {
  sysInfo.clientFlags.push("-recaptcha");
}

if(!process.env.REDIS_SERVER) {
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

let url = process.env.MONGO_URL;

if(process.env.DATABASE_URL) {
  url = process.env.DATABASE_URL;
}

connect(url, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true,
  sslCA: process.env.MONGO_CA ? [fs.readFileSync(process.env.MONGO_CA)] : null
}).then(() => {
  Loggers.dbLogger.info("Connected to database sucessfully");
    Loggers.dbLogger.info("Setting up DB schema");
    require('./database/database');
    require('./database/indexes');
    Loggers.apolloLogger.info("Starting Apollo");
    const app = express();
    if(!process.env.REDIS_SERVER) {
      Loggers.mainLogger.warn("RUNNING IN DEVELOPMENT MODE, NOT USING REDIS");
    }
    Loggers.apolloLogger.info("Verifying schema integrity");
    let schema = "";
    if(yn(process.env.DEVELOPMENT)) {
      schema = readFileSync('src/starship-schema/schema.graphql', 'utf8');
    } else {
      schema = readFileSync('dist/starship-schema/schema.graphql', 'utf8');
    }
    if(!schema.startsWith("# starship-schema ")) {
      Loggers.apolloLogger.fatal("Invalid schema header. Expected '# starship-schema (version)', got '" + schema.split("\n")[0] + "'.");
      Loggers.mainLogger.fatal("Exiting...");
      process.exit(3);
    }
    if(!schema.startsWith("# starship-schema " + sysInfo.schemaVersion)) {
      Loggers.apolloLogger.fatal("Server schema version mismatch. Verify that schema.graphql is the correct version.");
      Loggers.apolloLogger.fatal("sysInfo.schemaVersion: " + sysInfo.schemaVersion);
      Loggers.apolloLogger.fatal("schema.graphql version: " + schema.split("\n")[0].split("starship-schema ")[1]);
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
      tracing: yn(process.env.DEVELOPMENT),
      cache: (process.env.REDIS_SERVER ? new RedisCache({
        host: process.env.REDIS_SERVER,
        port: Number(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD,
        username: process.env.REDIS_USERNAME,
        tls: {}
      }) : undefined)
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