import { PrismaClient } from "@prisma/client";
import {createFluidAdapter,selfhostPoolConfig} from "./fluid-db-pool";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const globalWithPrisma = globalThis as unknown as { rubyPrisma?:PrismaClient };
export const databaseConfigured=()=>Boolean(process.env.RUBY_SELFHOST_DB || process.env.DATABASE_URL?.startsWith("postgresql://") || process.env.DATABASE_URL?.startsWith("postgres://"));

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

// The provider-managed database remains available for an explicit rollback;
// never silently fall back to it when the new production database fails.
let selfhostUrl:string|undefined;
function selfhostDatabaseUrl(){
  if(selfhostUrl)return selfhostUrl;
  try{
    const config=JSON.parse(process.env.RUBY_SELFHOST_DB!);
    const url=new URL(config.url);
    if(!["postgresql:","postgres:"].includes(url.protocol)||url.hostname!=="panel.webaltyapi.com"||url.port!=="55433"||url.username!=="rubyhair_app"||url.pathname!=="/rubyhair"||!url.password||typeof config.ca!=="string"||typeof config.identity!=="string"||typeof config.identityPassword!=="string")throw new Error("invalid");
    const directory=mkdtempSync(join(tmpdir(),"rubyhair-db-"));
    const ca=join(directory,"ca.pem"),identity=join(directory,"client.p12");
    writeFileSync(ca,Buffer.from(config.ca,"base64"),{mode:0o600});
    writeFileSync(identity,Buffer.from(config.identity,"base64"),{mode:0o600});
    url.searchParams.set("sslmode","require");
    url.searchParams.set("sslaccept","strict");
    url.searchParams.set("sslcert",ca);
    url.searchParams.set("sslidentity",identity);
    url.searchParams.set("sslpassword",config.identityPassword);
    // Self-hosted PostgreSQL has a dedicated 45-connection relay; two
    // slots avoid head-of-line blocking of concurrent serverless reads.
    url.searchParams.set("connection_limit","2");
    url.searchParams.set("pool_timeout","20");
    url.searchParams.set("connect_timeout","10");
    // Retire idle Prisma connections before the database role (240s) and TCP relay (300s).
    url.searchParams.set("max_idle_connection_lifetime","45");
    url.searchParams.set("max_connection_lifetime","180");
    selfhostUrl=url.toString();
    return selfhostUrl;
  }catch{
    throw new Error("Ruby Hair self-hosted PostgreSQL TLS configuration is invalid");
  }
}

export function getPrisma(){
  if(!databaseConfigured()) throw new Error("Ruby Hair PostgreSQL DATABASE_URL is not configured");
  if(globalWithPrisma.rubyPrisma)return globalWithPrisma.rubyPrisma;
  // Use the platform-aware pool only for the approved self-hosted production runtime.
  // Explicit legacy mode is retained for a controlled rollback, never an automatic fallback.
  if(process.env.RUBY_SELFHOST_DB&&process.env.VERCEL&&process.env.RUBY_DB_FLUID_POOL==="enabled"){
    const {adapter}=createFluidAdapter(selfhostPoolConfig(process.env.RUBY_SELFHOST_DB));
    return globalWithPrisma.rubyPrisma=new PrismaClient({adapter,log:["error"]});
  }
  return globalWithPrisma.rubyPrisma ||= new PrismaClient({
    // Vercel lambdas must not open five direct PostgreSQL sessions each.
    // Preserve the configured pooler URL and any explicit connection settings.
    datasources:{db:{url:process.env.RUBY_SELFHOST_DB?selfhostDatabaseUrl():runtimeDatabaseUrl()}},
    log: process.env.NODE_ENV==="development"?["error","warn"]:["error"]
  });
}
