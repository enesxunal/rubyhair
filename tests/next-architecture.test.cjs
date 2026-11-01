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
test("custom postgres schema covers products variants orders and payments",()=>{
  const sql=fs.readFileSync(path.join(base,"db/schema.sql"),"utf8");
  for(const table of ["catalog_products","product_variants","shop_orders","order_lines","payment_events"]){
    assert.ok(sql.includes("CREATE TABLE IF NOT EXISTS "+table),table);
  }
});
