import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL as string;

if (!DATABASE_URL)
  console.error("DATABASE_URL not set. DB client may not initialize.");

const client = postgres(DATABASE_URL);
export const db = drizzle(client);
