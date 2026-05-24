import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.js"; // Note: .js extension for NodeNext module resolution

// Determine which database URL to use
const connectionString = process.env.USE_MOCK_DB === 'true' 
  ? (process.env.MOCK_DATABASE_URL || process.env.DATABASE_URL)
  : process.env.DATABASE_URL;

const pool = new Pool({ connectionString });

export const db = drizzle(pool, { schema });
