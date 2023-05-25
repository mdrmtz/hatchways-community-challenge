const { Pool } = require('pg');

// Create a PostgreSQL connection pool
const pool = new Pool({
    connectionString: 'your-postgres-connection-string',
});

const resolvers = {
    Query: {
        worker: async (_, { workerId }) => {
            const workerQuery = 'SELECT * FROM "Worker" WHERE "id" = $1';
            const workerResult = await pool.query(workerQuery, [workerId]);
            const worker = workerResult.rows[0];

            return worker;
        },
    },

    Worker: {
        shifts: async (worker) => {
            const shiftsQuery = `
        SELECT *
        FROM "Shift"
        WHERE "profession" = $1
          AND "is_deleted" = false
          AND "facility_id" IN (
            SELECT "facility_id"
            FROM "FacilityRequirement"
            WHERE "document_id" NOT IN (
              SELECT "document_id"
              FROM "DocumentWorker"
              WHERE "worker_id" = $2
            )
          )
          AND "id" NOT IN (
            SELECT s."id"
            FROM "Shift" s
            INNER JOIN "DocumentWorker" dw ON dw."worker_id" = $2
            WHERE s."start" <= (SELECT "end" FROM "Shift" WHERE "worker_id" = $2)
              AND s."end" >= (SELECT "start" FROM "Shift" WHERE "worker_id" = $2)
          )
          AND "facility_id" IN (
            SELECT "id"
            FROM "Facility"
            WHERE "is_active" = true
          )
          AND "worker_id" IS NULL
      `;

            const shiftsResult = await pool.query(shiftsQuery, [worker.profession, worker.id]);
            const shifts = shiftsResult.rows;

            return shifts;
        },
    },

    Shift: {
        facility: async (shift) => {
            const facilityQuery = 'SELECT * FROM "Facility" WHERE "id" = $1';
            const facilityResult = await pool.query(facilityQuery, [shift.facility_id]);
            const facility = facilityResult.rows[0];

            return facility;
        },

        claimed_by: async (shift) => {
            if (!shift.worker_id) {
                return null;
            }

            const claimedByQuery = 'SELECT * FROM "Worker" WHERE "id" = $1';
            const claimedByResult = await pool.query(claimedByQuery, [shift.worker_id]);
            const claimedByWorker = claimedByResult.rows[0];

            return claimedByWorker;
        },
    },
};

module.exports = resolvers;
