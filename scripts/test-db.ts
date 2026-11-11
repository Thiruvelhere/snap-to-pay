
import "dotenv/config";
import { Pool } from "pg";

async function testDatabase() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        throw new Error("DATABASE_URL is missing");
    }

    const pool = new Pool({
        connectionString,
        ssl: {
            rejectUnauthorized: true,
        },
    });

    try {
        const result = await pool.query(`
      SELECT
        NOW() AS server_time,
        current_database() AS database_name,
        current_user AS database_user,
        version() AS postgres_version
    `);

        console.log("Database connection successful!");
        console.log(result.rows[0]);
    } catch (error) {
        console.error("Database connection failed:", error);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

testDatabase();
