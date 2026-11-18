import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,statSync} from "node:fs";
import {join} from "node:path";
const root=process.cwd();
test("Ruby Hair has site icons with correct signatures and unique cache-busted metadata",()=>{
 const app=readFileSync(join(root,"app/layout.tsx"),"utf8");
 assert.match(app,/icons:\{/);
 assert.match(app,/favicon\.ico\?v=20261118/);
 assert.match(app,/ruby-hair-favicon-48\.png\?v=20261118/);
 assert.match(app,/ruby-hair-apple-touch-icon\.png\?v=20261118/);
 for(const name of ["ruby-hair-favicon-32.png","ruby-hair-favicon-48.png","ruby-hair-favicon-192.png","ruby-hair-favicon-512.png","ruby-hair-apple-touch-icon.png"]){
  const file=join(root,"public",name);
  assert.ok(statSync(file).size>500,name+" missing");
  assert.equal(readFileSync(file).subarray(1,4).toString(),"PNG",name+" wrong signature");
 }
 const ico=readFileSync(join(root,"public","favicon.ico"));
 assert.deepEqual([...ico.subarray(0,4)],[0,0,1,0]);
 assert.ok(ico.length>500);
});
