const { Pool } = require('pg');
const { ApolloServer, gql } = require('apollo-server');
const fs = require('fs');

const pool = new Pool({
    connectionString: 'postgres://postgres:postgres@localhost:5432/postgres',
});

const typeDefs = fs.readFileSync('./schema.graphql', 'utf8');

const resolvers = {
    Query: {
        shifts: async () => {
            const client = await pool.connect();
            try {
                const query = 'SELECT * FROM "Shift"';
                const result = await client.query(query);
                return result.rows;
            } finally {
                client.release();
            }
        },
    },
};

const server = new ApolloServer({ typeDefs, resolvers });

server.listen().then(({ url }) => {
    console.log(`Server running at ${url}`);
});