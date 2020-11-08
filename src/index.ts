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
  version: "prealpha",
  production: !Boolean(process.env.DEVELOPMENT),
  schemaVersion: "0.2",
  syncEnabled: process.env.REDIS_URL !== undefined,
  subscriptionsSupported: false,
  supportedFeatures: ["users", "reports", "planets"],
  supportedComponents: [],
  recaptchaEnabled: process.env.RECAPTCHA_SECRET !== undefined,
  emailVerificationEnabled: false,
  bucketConnected: process.env.BUCKET_ENDPOINT !== undefined,
  clientFlags: ["noproduction", "experimental"]
};

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

        if (req.headers.authorization !== undefined) {
          const token = req.headers.authorization.replace('Bearer ', '');
          user = jwt.verify(token, process.env.SECRET) as IUserToken;
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