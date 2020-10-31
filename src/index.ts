require('dotenv').config()
const { ApolloServer, gql } = require('apollo-server-express');
const { readFileSync } = require('fs')
const express = require('express');
const logger = require('./logging');
const jwt = require('jsonwebtoken');

logger.mainLogger.info("Starting starship-server");
logger.mainLogger.warn("PRE-ALPHA BUILD; DO NOT USE IN PRODUCTION");

const resolvers = require('./resolvers/resolvers').default;

const mongoose = require('mongoose');

const sysInfo = {
  serverName: "starship-server",
  version: "prealpha",
  production: !Boolean(process.env.DEVELOPMENT),
  schemaVersion: "0.1c",
  syncEnabled: process.env.REDIS_URL != undefined,
  subscriptionsSupported: false,
  supportedFeatures: ["users", "reports"],
  supportedComponents: [],
  recaptchaEnabled: process.env.RECAPTCHA_SECRET != undefined,
  emailVerificationEnabled: false,
  bucketConnected: process.env.BUCKET_ENDPOINT != undefined,
  clientFlags: ["noproduction", "experimental"]
}

mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true
}, (error) => {
  if(error) {
    logger.dbLogger.error(error);
  } else {
    logger.dbLogger.info("Connected to database sucessfully");
    logger.dbLogger.info("Setting up DB schema");
    require('./database/database');
    logger.apolloLogger.info("Starting Apollo");
    const app = express();
    if(!process.env.REDIS_URL) {
      logger.mainLogger.warn("RUNNING IN DEVELOPMENT MODE, NOT USING REDIS")
    }
    const typeDefs = gql`${readFileSync('dist/starship-schema/schema.graphql')}`;
    const server = new ApolloServer({
      typeDefs, 
      resolvers,
      context: ({req}) => {
        let user = null;

        if (req.headers.authorization !== undefined) {
          const token = req.headers.authorization.replace('Bearer ', '')
          user = jwt.verify(token, process.env.SECRET)
        };
        
        return {user};
      },
      resolverValidationOptions: {
        requireResolversForResolveType: false,
      }, 
    });

    server.applyMiddleware({ app });

    app.get('/', (req, res) => {
      res.json(sysInfo)
    })

    app.listen({ port: 4000 }, () =>
      logger.apolloLogger.info(`Server up at http://localhost:4000${server.graphqlPath}`)
    )
  }
});