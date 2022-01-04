import dotenv from "dotenv";
dotenv.config();

import { ApolloServer, gql } from "apollo-server-express";
import { PubSub } from "graphql-subscriptions";
import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis from "ioredis";
import { makeExecutableSchema } from '@graphql-tools/schema';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { execute, subscribe } from 'graphql';
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
import http from "http";
import { RedisCache } from "apollo-server-cache-redis";
import yn from "yn";
import fs from "fs";
import PubSubContainer from "./util/PubSubContainer";
import Users from "./database/Users";
import { v4 as uuidv4 } from 'uuid';
import SysInfo from "./util/SysInfo";
import download from "./express/download";

SysInfo.generateSysInfo();

let url = process.env.MONGO_URL;

if(process.env.DATABASE_URL) {
  url = process.env.DATABASE_URL;
}

connect(url, {
  sslCA: process.env.MONGO_CA ? fs.readFileSync(process.env.MONGO_CA, "utf8") : null
}).then(async () => {
  Loggers.dbLogger.info("Connected to database sucessfully");
    Loggers.dbLogger.info("Setting up DB schema");
    require('./database/database');
    require('./database/indexes');
    Loggers.apolloLogger.info("Starting Apollo");

    // setup pubsub
    Loggers.apolloLogger.info("Setting up PubSub");

    if(process.env.REDIS_SERVER) {
      Loggers.apolloLogger.info("Using Redis PubSub");
      const options : Redis.RedisOptions = {
        host: process.env.REDIS_SERVER,
        port: Number(process.env.REDIS_PORT),
        username: process.env.REDIS_USER,
        password: process.env.REDIS_PASSWORD,
        tls: {}
      };
      const pubsub = new RedisPubSub({
        publisher: new Redis(options),
        subscriber: new Redis(options)
      });
      PubSubContainer.pubSub = pubsub;
    } else {
      Loggers.apolloLogger.info("Using default PubSub");
      const pubsub = new PubSub();
      PubSubContainer.pubSub = pubsub;
    }

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
    if(!schema.startsWith("# starship-schema " + SysInfo.sysInfo.schemaVersion)) {
      Loggers.apolloLogger.fatal("Server schema version mismatch. Verify that schema.graphql is the correct version.");
      Loggers.apolloLogger.fatal("sysInfo.schemaVersion: " + SysInfo.sysInfo.schemaVersion);
      Loggers.apolloLogger.fatal("schema.graphql version: " + schema.split("\n")[0].split("starship-schema ")[1]);
      Loggers.mainLogger.fatal("Exiting...");
      process.exit(2);
    }

    let uuid = uuidv4();
 
    // setup session stuff
    if(!fs.existsSync("./uuid.txt")) {
      Loggers.mainLogger.info(`First startup, new UUID is ${uuid}`);
      Loggers.mainLogger.info(`UUID saved`);
      fs.writeFileSync("./uuid.txt", uuid);
    } else {
      uuid = readFileSync("./uuid.txt").toString();
      Loggers.mainLogger.info(`UUID loaded from uuid.txt is ${uuid}`);
    }

    Loggers.dbLogger.info("Clearing UUID from user sessions");
    await Users.findOneAndUpdate({sessions: uuid}, {$pull: {sessions: uuid}}, {new: true});

    const typeDefs = gql`${schema}`;
    const executableSchema = makeExecutableSchema({ typeDefs, resolvers });

    const server = new ApolloServer({
      typeDefs,
      resolvers,
      context: ({req}) => {
        let user: IUserToken = null;
        let token: string = null;

        if(req) {
          if (req.headers.authorization !== undefined && req.headers.authorization.includes("Bearer")) {
            token = req.headers.authorization;
          }

          if(token) {
            token = token.replace('Bearer ', '');
            user = jwt.verify(token, process.env.SECRET) as IUserToken;
            if(user.id == undefined) {
              user = null;
            }
          }

          const ctx = new Context();
          
          ctx.user = user;
          ctx.loaders = new Loaders();
  
          return ctx;
        }
      },
      cache: (process.env.REDIS_SERVER ? new RedisCache({
        host: process.env.REDIS_SERVER,
        port: Number(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD,
        username: process.env.REDIS_USERNAME,
        tls: {}
      }) : undefined),
      plugins: [{
        // eslint-disable-next-line @typescript-eslint/require-await
        async serverWillStart() {
          return {
            // eslint-disable-next-line @typescript-eslint/require-await
            async drainServer() {
              subscriptionServer.close();
            }
          };
        }
      }],
    });

    await server.start();

    server.applyMiddleware({ app });

    app.use('/files', download);

    app.get('/', (_, res) => {
      res.json(SysInfo.sysInfo);
    });

    const httpServer = http.createServer(app);
    Loggers.apolloLogger.info("Creating subscription server");

    const subscriptionServer = SubscriptionServer.create({
      // This is the `schema` we just created.
      schema: executableSchema,
      // These are imported from `graphql`.
      execute,
      subscribe,
      // Providing `onConnect` is the `SubscriptionServer` equivalent to the
      // `context` function in `ApolloServer`. Please [see the docs](https://github.com/apollographql/subscriptions-transport-ws#constructoroptions-socketoptions--socketserver)
      // for more information on this hook.
      onConnect: async (connectionParams: { [x: string]: string; }, ws: { onclose: any; }) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const { onclose } = ws;
        // eslint-disable-next-line
        if (connectionParams["Authorization"] !== undefined && connectionParams["Authorization"].includes("Bearer")) {
          // eslint-disable-next-line
          let token = connectionParams["Authorization"] as string;

          if(token) {
            token = token.replace('Bearer ', '');
            const user = jwt.verify(token, process.env.SECRET) as IUserToken;
            if(user.id != undefined) {
              const userForContext = await Users.findOneAndUpdate({_id: user.id}, {$push: {sessions: uuid}}, {new: true});
              // this isn't a super great idea, but I couldn't think of
              // anything better
              // TODO: if apollo makes an API to do this correctly then we should do it correctly
              // they have disconnected, decrement sessionCount
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              ws.onclose = async (e: any) => {
                // eslint-disable-next-line
                // remove one single element from the array of sessions
                await Users.findOneAndUpdate({_id: user.id, sessions: uuid}, {"$unset": {"sessions.$": ""}}, {new: true});
                await Users.findOneAndUpdate({_id: user.id}, {$pull: {sessions: null}}, {new: true});
    
                if(onclose) {
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                  onclose(e);
                }
              };

              const ctx = new Context();
        
              ctx.user = user;
              ctx.subscriptionUser = userForContext;
              // we can't use these but they're here anyways
              ctx.loaders = new Loaders();
              return ctx;
            }
          }
        }
      }
    }, {
      // This is the `httpServer` we created in a previous step.
      server: httpServer,
      // This `server` is the instance returned from `new ApolloServer`.
      path: server.graphqlPath,
    });
    
    httpServer.listen({ port: Number(process.env.PORT) }, () => {
      Loggers.apolloLogger.info(`Server up at http://localhost:${process.env.PORT}${server.graphqlPath}`);
    });
}).catch((error) => {
  Loggers.dbLogger.error(error);
  Loggers.mainLogger.fatal("Exiting...");
  process.exit(1);
});
