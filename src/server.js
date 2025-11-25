const { ApolloServer } = require('apollo-server');
const typeDefs = require('./schema/typeDefs');
const resolvers = require('./resolvers');
const { buildContext } = require('./auth/context');

const PORT = process.env.PORT || 4000;

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: buildContext
});

server.listen({ port: PORT }).then(({ url }) => {
  console.log(`API ready at ${url}`);
});
