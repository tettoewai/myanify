import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Global variable to store the Prisma client and related resources
// This prevents multiple instantiations in development with hot reloading
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
  adapter: PrismaPg | undefined;
};

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Create PostgreSQL connection pool (singleton pattern)
const pool =
  globalForPrisma.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.pool = pool;
}

// Create Prisma adapter for PostgreSQL (singleton pattern)
const adapter = globalForPrisma.adapter ?? new PrismaPg(pool);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.adapter = adapter;
}

// Create Prisma Client (singleton pattern)
// This prevents multiple instantiations in development with hot reloading
// Query logging is disabled by default to reduce console noise
// Set PRISMA_LOG_QUERIES=true in your .env file to enable query logging
const shouldLogQueries = process.env.PRISMA_LOG_QUERIES === "true";
const logLevels: Array<"query" | "error" | "warn" | "info"> = ["error", "warn"];

if (shouldLogQueries) {
  logLevels.push("query");
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "production" ? ["error"] : logLevels,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
