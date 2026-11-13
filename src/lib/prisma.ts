import { PrismaClient } from "@prisma/client";
const globalWithPrisma = globalThis as unknown as { rubyPrisma?:PrismaClient };
export const databaseConfigured=()=>Boolean(process.env.DATABASE_URL?.startsWith("postgresql://") || process.env.DATABASE_URL?.startsWith("postgres://"));

export function getPrisma(){
  if(!databaseConfigured()) throw new Error("Ruby Hair PostgreSQL DATABASE_URL is not configured");
  return globalWithPrisma.rubyPrisma ||= new PrismaClient({
    // Use pooled connection for serverless requests while migration CLI retains direct DATABASE_URL.
    datasources:{db:{url:process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL}},
    log: process.env.NODE_ENV==="development"?["error","warn"]:["error"]
  });
}
