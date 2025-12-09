// Re-export prisma from db.ts for backward compatibility
// Use db.ts directly in new code
export { prisma } from "../db";
export type { PrismaClient } from "@prisma/client";
