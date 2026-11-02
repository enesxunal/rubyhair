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
        // Publicly documented legacy pages are linked as sources, not fetched at runtime.
        if(!full.endsWith("legacy-store-facts.ts"))assert.equal(content.includes("https://rubyhair.de/"),false,full);
        assert.equal(content.includes("/wp-json/"),false,full);
      }
    }
  };
  scan(path.join(base,"app"));
  scan(path.join(base,"src"));
  assert.equal(fs.existsSync(path.join(base,"public/legacy-app.js")),false);
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

test("native homepage uses React and current server catalog, not injected HTML bridge",()=>{
  const home=fs.readFileSync(path.join(base,"app/page.tsx"),"utf8");
  const frontend=fs.readFileSync(path.join(base,"src/components/home-frontend.tsx"),"utf8");
  assert.ok(home.includes("getStoreCatalog()"));
  assert.ok(home.includes("<HomeFrontend products={products}/>"));
  assert.ok(frontend.includes("function Favorites({products}"));
  assert.ok(frontend.includes("aria-pressed={i===index}"));
  assert.ok(frontend.includes("useCart()"));
  assert.ok(!home.includes("dangerouslySetInnerHTML"));
  assert.equal(fs.existsSync(path.join(base,"src/data/home.html")),false);
  assert.ok(fs.existsSync(path.join(base,"archive/legacy-preview/home-approved-before-native.html")));
});
test("public guide and contact do not invent order processing or email submissions",()=>{
  const guide=fs.readFileSync(path.join(base,"app/ratgeber/page.tsx"),"utf8");
  const contact=fs.readFileSync(path.join(base,"app/kontakt/page.tsx"),"utf8");
  const composer=fs.readFileSync(path.join(base,"src/components/contact-composer.tsx"),"utf8");
  for(const content of ["25 Bondings / Packung","10 Tape-ins / Packung","Pflege","faq"]) {
    assert.ok(guide.toLowerCase().includes(content.toLowerCase()),content);
  }
  assert.ok(contact.includes("info@rubyhair.de"));
  assert.ok(contact.includes("45130 Essen"));
  assert.ok(composer.includes('mailto:'));
  assert.ok(composer.includes("window.location.href=mailto"));
  assert.ok(!composer.includes('fetch('));
});
test("product pages link to care and contact routes",()=>{
  const details=fs.readFileSync(path.join(base,"src/components/product-detail.tsx"),"utf8");
  assert.ok(details.includes('href="/ratgeber/"'));
  assert.ok(details.includes('href="/kontakt/"'));
  assert.ok(details.includes('rh-product-help'));
});
test("product preview distinguishes specific color images from editorial collection photos",()=>{
  const product=fs.readFileSync(path.join(base,"src/components/product-detail.tsx"),"utf8");
  for(const item of ["Vergrößerte Produktansicht","rh-gallery-thumb","Ausgewählter Farbton",
    "Kollektion / Illustration","Unverbindlicher Demo-Preis","tatsächlicher Lagerbestand noch nicht bestätigt"]){
    assert.ok(product.includes(item),item);
  }
  assert.ok(product.includes("lightbox.current?.showModal()"));
  assert.ok(product.includes("lightbox.current?.close()"));
});
test("shipping and returns preview does not claim unapproved checkout conditions",()=>{
  const shipping=fs.readFileSync(path.join(base,"app/versand-zahlung/page.tsx"),"utf8");
  assert.ok(shipping.includes("4,99 € Versandpauschale"));
  assert.ok(shipping.includes("bis zu 5 Werktagen"));
  assert.ok(shipping.includes("noch keine Zahlungsarten aktiviert"));
  assert.ok(shipping.includes("Quell") || shipping.includes("Quelle"));
  assert.ok(shipping.includes("Quelle: rubyhair.de"));
  const legal=fs.readFileSync(path.join(base,"app/rechtliches/[slug]/page.tsx"),"utf8");
  assert.ok(legal.includes("old.vatId"));
  assert.ok(legal.includes("Zweigertstraße 8"));
  assert.ok(legal.includes("Widerrufsbelehrung"));
  assert.ok(legal.includes("robots:{index:false"));
  assert.ok(shipping.includes('robots:{index:false'));
  const merchant=fs.readFileSync(path.join(base,"MERCHANT-APPROVAL.md"),"utf8");
  assert.ok(merchant.includes("NOT APPROVED"));
  assert.ok(merchant.includes("conflicts"));
  assert.ok(merchant.includes("Zweigertstrasse"));
  assert.ok(merchant.includes("Klara Strasse"));
});
test("checkout preview reuses authoritative cart quotation and cannot collect payment details",()=>{
  const checkout=fs.readFileSync(path.join(base,"src/components/checkout-preview.tsx"),"utf8");
  const quoteHook=fs.readFileSync(path.join(base,"src/hooks/use-cart-quote.ts"),"utf8");
  const cart=fs.readFileSync(path.join(base,"src/components/cart-page.tsx"),"utf8");
  assert.ok(quoteHook.includes('fetch("/api/cart/quote"'));
  assert.ok(checkout.includes("useCartQuote(lines)"));
  assert.ok(cart.includes("useCartQuote(lines)"));
  assert.ok(checkout.includes("keine Adressen, Bestellungen oder Zahlungsdaten"));
  assert.ok(!checkout.includes("<input"));
  assert.ok(!checkout.includes("createOrder"));
});
test("cart preserves selected variant color and length for return to product",()=>{
  const cart=fs.readFileSync(path.join(base,"src/components/cart-page.tsx"),"utf8");
  const product=fs.readFileSync(path.join(base,"src/components/product-detail.tsx"),"utf8");
  const page=fs.readFileSync(path.join(base,"app/produkt/[slug]/page.tsx"),"utf8");
  assert.ok(cart.includes('encodeURIComponent(result.variation.length)'));
  assert.ok(product.includes("initialLength"));
  assert.ok(page.includes("initialLength={laenge}"));
});
test("imported catalog has a line-by-line merchant verification report",()=>{
  const data=JSON.parse(fs.readFileSync(path.join(base,"src/data/products.json"),"utf8"));
  const number=Object.values(data.products).reduce((n,p)=>n+p.variations.length,0);
  assert.equal(number,38);
  const rows=fs.readFileSync(path.join(base,"reports/catalog-38-variants.csv"),"utf8").trim().split("\n");
  assert.equal(rows.length,number+1);
  assert.ok(fs.readFileSync(path.join(base,"reports/catalog-review.md"),"utf8").includes("Tape-in EVE"));
});
