import {test} from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import {normalizedAdminPasswordHash} from "../src/lib/admin-password-config";

test("valid bcrypt hash is accepted, optional CLI assignment wrapper handled",async()=>{
 const raw=await bcrypt.hash("dummy-local-test-password",10);
 assert.equal(normalizedAdminPasswordHash(raw),raw);
 assert.equal(normalizedAdminPasswordHash("ADMIN_PASSWORD_HASH="+raw),raw);
 assert.equal(normalizedAdminPasswordHash("  ADMIN_PASSWORD_HASH='"+raw+"'  "),raw);
});
test("plaintext, truncated, arbitrary and unset values are rejected",()=>{
 for(const x of [undefined,"","password12345678","ADMIN_PASSWORD_HASH=password123","$2b$12$invalid","\"invalid\""])
  assert.equal(normalizedAdminPasswordHash(x),null);
});
