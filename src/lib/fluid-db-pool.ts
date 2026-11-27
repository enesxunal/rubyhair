import {Pool,type PoolConfig} from "pg";
import {PrismaPg} from "@prisma/adapter-pg";
import {attachDatabasePool} from "@vercel/functions";
import {createSecureContext,checkServerIdentity} from "node:tls";

// Keep the existing self-hosted database, hostname, port, credentials and mutual TLS.
// This parser has no network side effect and never returns raw config in errors.
export function selfhostPoolConfig(raw:string):PoolConfig{
 try{
  const config=JSON.parse(raw),url=new URL(config.url);
  if(!["postgresql:","postgres:"].includes(url.protocol)||url.hostname!=="panel.webaltyapi.com"||url.port!=="55433"||url.username!=="rubyhair_app"||url.pathname!=="/rubyhair"||!url.password||typeof config.ca!=="string"||typeof config.identity!=="string"||typeof config.identityPassword!=="string")throw Error("invalid");
  const ca=Buffer.from(config.ca,"base64"),pfx=Buffer.from(config.identity,"base64");
  if(!ca.length||!pfx.length)throw Error("invalid");
  const ssl={ca,pfx,passphrase:config.identityPassword,servername:url.hostname,checkServerIdentity:(_host:string,cert:import("node:tls").PeerCertificate)=>checkServerIdentity(url.hostname,cert),rejectUnauthorized:true,minVersion:"TLSv1.2" as const};
  createSecureContext(ssl);
  return {host:url.hostname,port:Number(url.port),user:url.username,password:decodeURIComponent(url.password),database:url.pathname.slice(1),ssl,max:2,min:0,idleTimeoutMillis:5000,connectionTimeoutMillis:10000,maxLifetimeSeconds:180,keepAlive:true,keepAliveInitialDelayMillis:10000,application_name:"rubyhair-fluid"};
 }catch{throw new Error("Ruby Hair self-hosted PostgreSQL TLS configuration is invalid")}
}
export function createFluidAdapter(config:PoolConfig){
 const pool=new Pool(config);
 // pg emits idle client errors when a remote server/network closes the socket.
 // The pool evicts the failed connection; log only a fixed code, never connection details.
 pool.on("error",()=>console.warn("RUBY_DB_IDLE_CLIENT_CLOSED"));
 if(process.env.VERCEL)attachDatabasePool(pool);
 return {pool,adapter:new PrismaPg(pool)};
}
