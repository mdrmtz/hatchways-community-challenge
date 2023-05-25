const {ApolloServer, gql} = require('apollo-server');
const {Pool} = require('pg');

// Create a PostgreSQL pool
const pool = new Pool({
    connectionString: 'postgres://postgres:postgres@localhost:5432/postgres',
});

const typeDefs = gql`
  enum Profession {
    CNA
    LVN
    RN
  }

  type Worker {
    id: ID!
    name: String!
    isActive: Boolean!
    profession: Profession!
    documents: [Document!]!
  }

  type Facility {
    id: ID!
    name: String!
    isActive: Boolean!
  }

  type Document {
    id: ID!
    name: String!
    isActive: Boolean!
  }

  type FacilityRequirement {
    id: ID!
    facility: Facility!
    document: Document!
  }

  type DocumentWorker {
    id: ID!
    worker: Worker!
    document: Document!
  }

  type Shift {
    id: ID!
    start: String!
    end: String!
    profession: Profession!
    isDeleted: Boolean!
    facility: Facility!
    worker: Worker
  }

  type Query {
    availableShifts(
      startDate: String!
      endDate: String!
      workerId: ID
    ): [Shift!]!
  }
`;

const resolvers = {
    Query: {
        availableShifts: async (_, {startDate, endDate, workerId}) => {
            const client = await pool.connect();

            try {
                // Fetch all active facilities
                const facilitiesQuery = `
                    SELECT *
                    FROM "Facility"
                    WHERE "is_active" = true
                `;
                const facilitiesResult = await client.query(facilitiesQuery);
                const facilities = facilitiesResult.rows;

                // Fetch the available shifts within the specified date range for each facility
                const shifts = [];

                for (const facility of facilities) {
                    const shiftsQuery = `
                        SELECT s.*, f.*
                        FROM "Shift" s
                                 INNER JOIN "Facility" f ON s."facility_id" = f."id"
                        WHERE s."start" >= $1
                          AND s."end" <= $2
                          AND s."is_deleted" = false
                          AND (s."worker_id" IS NULL OR s."worker_id" = $3)
                    `;
                    const shiftsResult = await client.query(shiftsQuery, [
                        startDate,
                        endDate,
                        workerId,
                    ]);

                    shifts.push(...shiftsResult.rows.map((row) => ({...row, facility})));
                }

                // Fetch worker details if workerId is provided
                if (workerId) {
                    const workerQuery = `
                        SELECT *
                        FROM "Worker"
                        WHERE "id" = $1
                          AND "is_active" = true
                    `;
                    const workerResult = await client.query(workerQuery, [workerId]);

                    if (workerResult.rows.length === 0) {
                        return []; // Empty array if the worker is inactive or not found
                    }

                    const worker = workerResult.rows[0];

                    // Fetch worker documents
                    const documentsQuery = `
                        SELECT d.*
                        FROM "Document" d
                                 INNER JOIN "DocumentWorker" dw ON d."id" = dw."document_id"
                        WHERE dw."worker_id" = $1
                          AND d."is_active" = true
                    `;
                    const documentsResult = await client.query(documentsQuery, [workerId]);

                    worker.documents = documentsResult.rows;

                    // Filter shifts based on worker's profession and documents
                    const filteredShifts = shifts.filter((shift) => {
                        return (
                            shift.profession === worker.profession &&
                            shift.facility.id === shift.facilityId &&
                            worker.documents.every((doc) =>
                                shift.facility.requirements.some((req) => req.document.id === doc.id)
                            )
                        );
                    });

                    return filteredShifts;
                }

                return shifts;
            } finally {
                client.release();
            }
        },
    },
};

const server = new ApolloServer({typeDefs, resolvers});

server.listen().then(({url}) => {
    console.log(`Server ready at ${url}`);
});
