const { Pool } = require('pg');
const winston = require('winston'); // Import the Winston logging library

// Create a Winston logger instance
const logger = winston.createLogger({
    level: 'info', // Set the log level (e.g., 'info', 'debug', 'error')
    format: winston.format.combine(
        winston.format.timestamp(), // Add timestamp to log entries
        winston.format.simple() // Use the default log format
    ),
    transports: [
        // Specify the log output transports (e.g., console, file)
        new winston.transports.Console(), // Output logs to the console
        new winston.transports.File({ filename: 'logs.log' }) // Output logs to a file
    ]
});

const Redis = require('ioredis');

// Create a PostgreSQL pool
const pool = new Pool({
    connectionString: 'postgres://postgres:postgres@localhost:5432/postgres',
});

// Create a Redis client
const redisClient = new Redis();

const resolvers = {
    Query: {
        availableShifts: async (_, { startDate, endDate, workerId }) => {
            try {
                // Check if the data is available in the cache
                const cacheKey = `availableShifts:${startDate}:${endDate}:${workerId}`;
                const cachedData = await redisClient.get(cacheKey);

                if (cachedData) {
                    return JSON.parse(cachedData);
                }

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

                        shifts.push(...shiftsResult.rows.map((row) => ({ ...row, facility })));
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

                        // Store the data in the cache
                        await redisClient.set(cacheKey, JSON.stringify(filteredShifts));

                        return filteredShifts;
                    }

                    // Store the data in the cache
                    await redisClient.set(cacheKey, JSON.stringify(shifts));

                    return shifts;
                } finally {
                    client.release();
                }
            } catch (error) {
                // Log the error
                logger.error('An error occurred in availableShifts resolver:', error);

                // Throw the error to propagate it to the caller
                throw error;
            }
        },
    },
};

module.exports = resolvers;
