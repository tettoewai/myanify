import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Global variable to store the Prisma client and related resources.
// Reusing these in production also prevents one pool per module reload/process.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
  adapter: PrismaPg | undefined;
};

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Create PostgreSQL connection pool (singleton pattern)
// Neon serverless sleeps after ~5m idle → first query times out; add keepAlive + timeouts to reduce intermittent 500/403
const pool =
  globalForPrisma.pool ??
  new Pool({
    // sslmode is already set via sslmode=require in DATABASE_URL; don't pass a
    // conflicting ssl object (rejectUnauthorized:false weakens TLS and caused ECONNRESET)
    connectionString: process.env.DATABASE_URL,
    // Keep the pool small for Neon/serverless deployments. Set
    // DATABASE_POOL_MAX to override this when the database plan allows more.
    max: Number.parseInt(process.env.DATABASE_POOL_MAX ?? "5", 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
    keepAlive: true,
  });

// Surface pool errors instead of silent hang
pool.on("error", (err) => {
  console.error("[db] Pool error:", err.message);
});

globalForPrisma.pool = pool;

// Create Prisma adapter for PostgreSQL (singleton pattern)
const adapter = globalForPrisma.adapter ?? new PrismaPg(pool);

globalForPrisma.adapter = adapter;

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

globalForPrisma.prisma = prisma;

export default prisma;

/**
 * Runs an async DB operation, retrying transient Neon serverless failures.
 * Neon cold-starts / drops idle connections, producing ECONNRESET / P1001
 * errors on the first query after 5min idle. Retrying once recovers cleanly.
 */
export async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const code =
        (err as { code?: string })?.code ??
        (err as { meta?: { code?: string } })?.meta?.code;
      const message = err instanceof Error ? err.message : String(err);
      const transient =
        code === "ECONNRESET" ||
        code === "P1001" ||
        code === "P2024" ||
        code === "P1002" ||
        message.includes("Connection terminated unexpectedly") ||
        message.includes("disconnected before secure TLS connection was established");
      if (!transient || attempt >= retries) throw err;
      const delay = 200 * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
      console.warn(
        `[db] transient ${code ?? "connection-error"}, retrying (${attempt + 1}/${retries})`,
      );
    }
  }
}
