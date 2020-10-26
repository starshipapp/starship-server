require('dotenv').config()
const { ApolloServer, gql } = require('apollo-server-express');
const { readFileSync } = require('fs')
const express = require('express');
const logger = require('./logging')

logger.mainLogger.info("Starting starship-server");
logger.mainLogger.warn("PRE-ALPHA BUILD; DO NOT USE IN PRODUCTION");

const resolvers = require('./resolvers/resolvers').default;

const mongoose = require('mongoose');

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
    const typeDefs = gql`${readFileSync('dist/starship-schema/schema.graphql')}`;
    const server = new ApolloServer({
      typeDefs, 
      resolvers,
      resolverValidationOptions: {
        requireResolversForResolveType: false,
      }, 
    });

    server.applyMiddleware({ app });

    app.listen({ port: 4000 }, () =>
      logger.apolloLogger.info(`Server up at http://localhost:4000${server.graphqlPath}`)
    )
  }
});