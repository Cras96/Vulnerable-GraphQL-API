const { ApolloServer } = require('apollo-server');
const typeDefs = require('./schema/typeDefs');
const resolvers = require('./resolvers');
const { buildContext } = require('./auth/context');
const { runtime } = require('./config/profiles');

const PORT = process.env.PORT || 4000;

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: buildContext,
  introspection: runtime.introspectionEnabled,
  playground: runtime.playgroundEnabled,
  debug: runtime.debugEnabled,
  formatError: (error) => {
    if (!runtime.verboseErrors) {
      return {
        message: error.message,
        path: error.path,
        locations: error.locations
      };
    }
    return {
      message: error.message,
      path: error.path,
      locations: error.locations,
      extensions: {
        code: error.extensions?.code,
        stacktrace: error.extensions?.exception?.stacktrace,
        originalError: error.originalError?.message
      }
    };
  }
});

server.listen({ port: PORT }).then(({ url }) => {
  console.log(`API ready at ${url} (profile: ${runtime.mode})`);
});
