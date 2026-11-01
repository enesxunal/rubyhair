const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const base=path.resolve(__dirname,"..");
const catalog=JSON.parse(fs.readFileSync(path.join(base,"src/data/products.json"),"utf8"));
test("imported Ruby Hair catalog has exactly 2 products and 38 unique variants",()=>{
  const list=Object.values(catalog.products);
  assert.equal(list.length,2);
  const all=list.flatMap(p=>p.variations);
  assert.equal(all.length,38);
  assert.equal(new Set(all.map(v=>v.id)).size,38);
  assert.ok(all.every(v=>v.price>0&&Number.isFinite(v.price)));
});
test("all product pictures and variants are owned local files",()=>{
  for(const p of Object.values(catalog.products)){
    for(const image of [p.image,...p.variations.map(v=>v.image)]){
      assert.ok(image.startsWith("/media/"),image);
      assert.ok(fs.existsSync(path.join(base,"public",image)));
    }
  }
});
test("Next.js runtime does not reference WordPress endpoints",()=>{
  const scan=(dir)=>{
    for(const item of fs.readdirSync(dir,{withFileTypes:true})){
      const full=path.join(dir,item.name);
      if(item.isDirectory())scan(full);
      else if(/\.(?:ts|tsx|html|js|json)$/.test(item.name)){
        const content=fs.readFileSync(full,"utf8");
        assert.equal(content.includes("https://rubyhair.de/"),false,full);
        assert.equal(content.includes("/wp-json/"),false,full);
      }
    }
  };
  scan(path.join(base,"app"));
  scan(path.join(base,"src"));
  assert.equal(fs.readFileSync(path.join(base,"public/legacy-app.js"),"utf8").includes("https://rubyhair.de/"),false);
});
test("checkout is disabled until actual payment and database configured",()=>{
  const route=fs.readFileSync(path.join(base,"app/api/checkout/route.ts"),"utf8");
  assert.ok(route.includes("503"));
  assert.ok(route.includes("CHECKOUT_NOT_CONFIGURED"));
});
test("Prisma PostgreSQL models and migrations",()=>{
  const schema=fs.readFileSync(path.join(base,"prisma/schema.prisma"),"utf8");
  for(const model of ["Product","Variant","Order","OrderLine","PaymentEvent","AdminLoginAttempt"]){
    assert.ok(schema.includes("model "+model+" {"),model);
  }
  assert.ok(schema.includes('provider = "postgresql"'));
  assert.ok(schema.includes("stockQuantity  Int?"));
  const migration=path.join(base,"prisma/migrations");
  assert.ok(fs.readdirSync(migration).some(f=>fs.existsSync(path.join(migration,f,"migration.sql"))));
});
test("admin authentication has signed sessions and no default credentials",()=>{
  const auth=fs.readFileSync(path.join(base,"src/lib/admin-auth.ts"),"utf8");
  for(const name of ["ADMIN_PASSWORD_HASH","SESSION_SECRET","httpOnly:true","jwtVerify","recordLoginAttempt"]){
    assert.ok(auth.includes(name),name);
  }
});
test("admin mutations require authentication and validated fields",()=>{
  const source=fs.readFileSync(path.join(base,"app/admin/actions.ts"),"utf8");
  assert.ok(source.includes("if(!await isAdmin())redirect"));
  assert.ok(source.includes("z.string().uuid()"));
  assert.ok(source.includes("revalidatePath"));
});
test("server catalog queries PostgreSQL and fails closed on configured connection errors",()=>{
  const source=fs.readFileSync(path.join(base,"src/lib/catalog-server.ts"),"utf8");
  assert.ok(source.includes("getPrisma().product.findMany"));
  assert.ok(source.includes('source:"postgresql"'));
  assert.ok(source.includes('source:"imported-preview"'));
  assert.ok(!source.includes("catch("));
});

test("server cart quote validates IDs and uses server catalog prices",()=>{
  const route=fs.readFileSync(path.join(base,"app/api/cart/quote/route.ts"),"utf8");
  const source=fs.readFileSync(path.join(base,"src/lib/cart-quote.ts"),"utf8");
  assert.ok(route.includes("quoteRequestSchema.safeParse"));
  assert.ok(source.includes("getStoreCatalog()"));
  assert.ok(source.includes("Math.round(v.price*100)"));
  assert.ok(source.includes("checkoutEnabled:false"));
  assert.ok(source.includes("unverified-stock"));
  assert.ok(source.includes("out-of-stock"));
});
test("admin product content editing is authenticated and rejects unknown media files",()=>{
  const actions=fs.readFileSync(path.join(base,"app/admin/actions.ts"),"utf8");
  assert.ok(actions.includes("saveProductAction"));
  assert.ok(actions.includes('if(!await isAdmin())redirect("/admin/login")'));
  assert.ok(actions.includes("existsSync(join(process.cwd()"));
  assert.ok(actions.includes("productInput.safeParse"));
});
