import { PrismaClient } from "@prisma/client";
const globalWithPrisma = globalThis as unknown as { rubyPrisma?:PrismaClient };
export const databaseConfigured=()=>Boolean(process.env.DATABASE_URL?.startsWith("postgresql://") || process.env.DATABASE_URL?.startsWith("postgres://"));

function runtimeDatabaseUrl(){
  const raw=process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL!;
  if(!process.env.VERCEL)return raw;
  const url=new URL(raw);
  // Each Vercel function instance has its own Prisma pool. Across regions and
  // auto-scaled instances, two connections per instance exhausted the upstream
  // Prisma Postgres pool (P2024). The external pooler multiplexes a single
  // client connection per instance; preserve explicit URL overrides.
  if(!url.searchParams.has("connection_limit"))url.searchParams.set("connection_limit","1");
  if(!url.searchParams.has("pool_timeout"))url.searchParams.set("pool_timeout","25");
  return url.toString();
}

export function getPrisma(){
  if(!databaseConfigured()) throw new Error("Ruby Hair PostgreSQL DATABASE_URL is not configured");
  return globalWithPrisma.rubyPrisma ||= new PrismaClient({
    // Vercel lambdas must not open five direct PostgreSQL sessions each.
    // Preserve the configured pooler URL and any explicit connection settings.
    datasources:{db:{url:runtimeDatabaseUrl()}},
    log: process.env.NODE_ENV==="development"?["error","warn"]:["error"]
  });
}
