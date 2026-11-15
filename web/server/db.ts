import pg from "pg";

// A pool keeps a few connections open and lends one out per query.
// The DB_* variables are set in compose.yaml.
export const pool = new pg.Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// If Postgres restarts, idle connections break and the pool reports each one
// here. Without a listener Node treats that as fatal and the server exits.
// The pool discards the broken connection and opens a new one when needed.
pool.on("error", (error) => {
  console.error("Lost an idle database connection:", error.message);
});

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS advertisers (
    id         integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name       text NOT NULL,
    source     text NOT NULL CHECK (source IN ('uploaded_list', 'interaction')),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (name, source)
  )
`;

export async function initSchema(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // web1 and web2 start at the same moment. The lock makes the second one
    // wait until the first has finished, so they never both create the table.
    await client.query("SELECT pg_advisory_xact_lock(1)");
    await client.query(SCHEMA);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
