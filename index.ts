const {ApolloServer, gql} = require('apollo-server');
const { readFileSync } = require('fs');
const resolvers = require('./resolvers');

// Read the schema from the schema.graphql file
const typeDefs = readFileSync('schema.graphql', 'utf8');

const server = new ApolloServer({ typeDefs, resolvers });

server.listen().then(({url}) => {
    console.log(`Server ready at ${url}`);
});
