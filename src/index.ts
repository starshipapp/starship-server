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

const sysInfo = {
  serverName: "starship-server",
  version: "prealpha (0.4)",
  schemaVersion: "0.3d",
  supportedFeatures: ["users", "reports", "planets", "invites"],
  supportedComponents: ["pages", "wikis", "forums"],
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

if(!process.env.MAIL_URI) {
  sysInfo.clientFlags.push("-emailverify");
}

if(!process.env.DEVELOPMENT) {
  sysInfo.clientFlags.push("+development");
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
    const typeDefs = gql`${readFileSync('dist/starship-schema/schema.graphql')}`;
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

    app.listen({ port: 4000 }, () =>
      Loggers.apolloLogger.info(`Server up at http://localhost:4000${server.graphqlPath}`)
    );
}).catch((error) => {
  Loggers.dbLogger.error(error);
});