import { PrismaClient } from "@prisma/client";
const globalWithPrisma = globalThis as unknown as { rubyPrisma?:PrismaClient };
export const databaseConfigured=()=>Boolean(process.env.DATABASE_URL?.startsWith("postgresql://") || process.env.DATABASE_URL?.startsWith("postgres://"));

export function getPrisma(){
  if(!databaseConfigured()) throw new Error("Ruby Hair PostgreSQL DATABASE_URL is not configured");
  return globalWithPrisma.rubyPrisma ||= new PrismaClient({
    log: process.env.NODE_ENV==="development"?["error","warn"]:["error"]
  });
}
