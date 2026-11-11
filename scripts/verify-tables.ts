import "dotenv/config";
import { Pool } from "pg";

async function verifyTables() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log("Tables in database:", res.rows.map((r) => r.table_name));

    const constraints = await pool.query(`
      SELECT conname, contype, relname
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE nsp.nspname = 'public'
      ORDER BY relname, conname;
    `);

    console.log("\nConstraints:");
    for (const c of constraints.rows) {
      console.log(` - Table [${c.relname}]: ${c.conname} (type: ${c.contype})`);
    }
  } catch (err) {
    console.error("Verification failed:", err);
  } finally {
    await pool.end();
  }
}

verifyTables();

