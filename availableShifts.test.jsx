const { ApolloServer } = require('apollo-server');
const { createTestClient } = require('apollo-server-testing');
const { readFileSync } = require('fs');
const resolvers = require('./resolvers');

// Read the schema from the schema.graphql file
const typeDefs = readFileSync('schema.graphql', 'utf8');

// Create a test server
const server = new ApolloServer({ typeDefs, resolvers });
const { query } = createTestClient(server);

describe('AvailableShifts resolver', () => {
    it('returns available shifts', async () => {
        // Mock the necessary data for the test
        const startDate = '2023-05-25';
        const endDate = '2023-05-30';
        const workerId = '1';

        // Execute the query
        const { data, errors } = await query({
            query: `
        query {
          availableShifts(startDate: "${startDate}", endDate: "${endDate}", workerId: "${workerId}") {
            id
            start
            end
            profession
            isDeleted
            facility {
              id
              name
              isActive
            }
            worker @include(if: true) {
              id
              name
              isActive
              profession
              documents {
                id
                name
                isActive
              }
            }
          }
        }
      `,
        });

        // Assert that there are no errors
        expect(errors).toBeUndefined();

        // Assert that the data is as expected
        expect(data).toEqual({
            availableShifts: [
                // Define the expected structure of the response here
                // ...
            ],
        });
    });
});
