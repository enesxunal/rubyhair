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
  assert.ok(frontend.includes('className="hero rh-hero-product"'));
  assert.ok(frontend.includes("tapeInLengths.map("));
  assert.ok(!frontend.includes('KERATIN BONDINGS'));
  assert.ok(frontend.includes("aria-pressed={i===index}"));
  assert.ok(frontend.includes("useCart()"));
  assert.ok(!home.includes("dangerouslySetInnerHTML"));
  assert.equal(fs.existsSync(path.join(base,"src/data/home.html")),false);
  assert.ok(fs.existsSync(path.join(base,"archive/legacy-preview/home-approved-before-native.html")));
});
test("Tape-in storefront splits real 45-50 and 55-60 cm variants, with Keratin hidden from discovery",()=>{
  const tape=catalog.products["tape-in-extensions"];
  const short=tape.variations.filter(v=>v.length==="45-50-cm");
  const long=tape.variations.filter(v=>v.length==="55-60-cm");
  assert.equal(short.length,12);
  assert.equal(long.length,15);
  const home=fs.readFileSync(path.join(base,"src/components/home-frontend.tsx"),"utf8");
  const nav=fs.readFileSync(path.join(base,"src/components/site-shell.tsx"),"utf8");
  const grid=fs.readFileSync(path.join(base,"src/components/shade-grid.tsx"),"utf8");
  const collection=fs.readFileSync(path.join(base,"app/kollektionen/[slug]/page.tsx"),"utf8");
  assert.ok(home.includes('className="hero rh-hero-product"'));
  assert.ok(home.includes('href={tapeInLengthHref(choice.key)}'));
  assert.ok(!home.includes('keratin-bondings'));
  assert.ok(!nav.includes('/kollektionen/keratin-bondings/'));
  assert.ok(grid.includes('variants.filter(v=>v.length===selectedLength)'));
  assert.ok(grid.includes('"&laenge="+encodeURIComponent(selectedLength)'));
  assert.ok(collection.includes('selectedLength={selected?.key}'));
});
test("public guide and contact do not invent order processing or email submissions",()=>{
  const guide=fs.readFileSync(path.join(base,"app/ratgeber/page.tsx"),"utf8");
  const contact=fs.readFileSync(path.join(base,"app/kontakt/page.tsx"),"utf8");
  const composer=fs.readFileSync(path.join(base,"src/components/contact-composer.tsx"),"utf8");
  for(const content of ["Tape-in Kurz","Tape-in Lang","10 Tape-ins / Packung","Pflege","faq"]) {
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
test("local-only order reservation service fails closed and snapshots server-side prices",()=>{
  const source=fs.readFileSync(path.join(base,"src/lib/order-reservations.ts"),"utf8");
  for(const expected of ["LOCAL_TEST_ONLY","process.env.VERCEL","127.0.0.1","UNVERIFIED_STOCK",
    "INSUFFICIENT_STOCK","decrement:line.quantity","IDEMPOTENCY_CONFLICT","test_reserved",
    "test_cancelled","test_expired","unitPriceCents:variant.priceCents","reserveLocalTestOrder"]){
    assert.ok(source.includes(expected),expected);
  }
  assert.ok(!fs.readFileSync(path.join(base,"app/api/checkout/route.ts"),"utf8").includes("reserveLocalTestOrder"));
  assert.ok(fs.existsSync(path.join(base,"prisma/migrations/20261102094500_local_test_order_reservations/migration.sql")));
});
test("German withdrawal and legal compliance blockers are recorded",()=>{
  const doc=fs.readFileSync(path.join(base,"reports/legal-audit-2026-11-02.md"),"utf8");
  const legal=fs.readFileSync(path.join(base,"app/rechtliches/[slug]/page.tsx"),"utf8");
  assert.ok(doc.includes("356a"));
  assert.ok(doc.includes("312j"));
  assert.ok(doc.includes("357(2)"));
  assert.ok(legal.includes("19. Juni 2026"));
  assert.ok(legal.includes("elektronische Widerrufsfunktion"));
});
test("legacy policy mirrors the old shop sections without opening sales",()=>{
  const legal=fs.readFileSync(path.join(base,"app/rechtliches/[slug]/page.tsx"),"utf8");
  const checkout=fs.readFileSync(path.join(base,"src/components/checkout-preview.tsx"),"utf8");
  for(const section of ["1. Geltungsbereich","2. Vertragspartner","3. Vertragsschluss",
   "4. Widerrufsrecht","5. Preise und Versandkosten","6. Lieferung",
   "7. Zahlung","8. Eigentumsvorbehalt","9. Streitbeilegung"]){
    assert.ok(legal.includes(section),section);
  }
  assert.ok(legal.includes("14-tägige Frist"));
  assert.ok(legal.includes("Zweigertstraße 8"));
  assert.ok(checkout.includes("old.shipping.standardEuro"));
  assert.ok(checkout.includes("Sie wird hier nicht berechnet oder eingezogen"));
  const issues=fs.readFileSync(path.join(base,"reports/musteriye-sorulacak-konular-2026-11-02.md"),"utf8");
  for(const issue of ["Kargo","AGB","Klara Straße","Zweigertstraße","Klarna","19 Haziran 2026","EVE"]){
    assert.ok(issues.toLowerCase().includes(issue.toLowerCase()),issue);
  }
  assert.ok(fs.readFileSync(path.join(base,"app/api/checkout/route.ts"),"utf8").includes("503"));
});
test("admin pages use authenticated separate dashboard, product and read-only order views",()=>{
 const dash=fs.readFileSync(path.join(base,"app/admin/page.tsx"),"utf8");
 const products=fs.readFileSync(path.join(base,"app/admin/produkte/page.tsx"),"utf8");
 const orders=fs.readFileSync(path.join(base,"app/admin/bestellungen/page.tsx"),"utf8");
 const shell=fs.readFileSync(path.join(base,"app/admin/admin-shell.tsx"),"utf8");
 const actions=fs.readFileSync(path.join(base,"app/admin/actions.ts"),"utf8");
 for(const page of [dash,products,orders]){
   assert.ok(page.includes('if(!await isAdmin())redirect("/admin/login")'),"Guarded admin route");
   assert.ok(page.includes('robots:{index:false'),"Admin noindex");
   assert.ok(page.includes('dynamic="force-dynamic"'),"No static admin HTML");
 }
 assert.ok(shell.includes('aria-label="Admin Navigation"'));
 for(const href of ["/admin/produkte","/admin/bestellungen"]){assert.ok(shell.includes(href));}
 assert.ok(products.includes('aria-label="Bestandsfilter"'));
 assert.ok(products.includes('stockQuantity===null'));
 assert.ok(orders.includes('testOnly:false'));
 assert.ok(orders.includes('testOnly:true'));
 assert.ok(orders.includes('statusEvents'));
 assert.ok(!orders.includes('action={saveVariantAction}'));
 assert.ok(!orders.includes('payment_confirmed:['));
 assert.ok(dash.includes('Bestand ungeprüft'));
 assert.ok(actions.includes('redirect("/admin/produkte?updated=1")'));
 assert.ok(actions.includes('redirect("/admin/produkte?productUpdated=1")'));
 assert.ok(fs.existsSync(path.join(base,"src/styles/admin.css")));
});
test("hair try-on hides internal prompts and explicitly locks original hair color end-to-end",()=>{
  const lab=fs.readFileSync(path.join(base,"src/components/hair-tryon-lab.tsx"),"utf8");
  const api=fs.readFileSync(path.join(base,"app/api/tryon/generate/route.ts"),"utf8");
  const page=fs.readFileSync(path.join(base,"app/haar-anprobe/page.tsx"),"utf8");
  assert.ok(!lab.includes("Prompt kopieren"));
  assert.ok(!lab.includes("rh-tryon-prompt-panel"));
  assert.ok(!lab.includes("photoPrompt("));
  assert.ok(api.includes("EXISTING HAIR COLOR LOCK"));
  assert.ok(api.includes("ROOTS THROUGH ITS ORIGINAL TIPS"));
  assert.ok(api.includes("Color fidelity of existing hair takes priority"));
  assert.ok(api.includes("selected.product.slug!==\"tape-in-extensions\""));
  assert.ok(page.includes('filter(p=>p.slug==="tape-in-extensions")'));
});
test("virtual hair lab uses the real catalog and sends photos only with explicit consent",()=>{
 const page=fs.readFileSync(path.join(base,"app/haar-anprobe/page.tsx"),"utf8");
 const lab=fs.readFileSync(path.join(base,"src/components/hair-tryon-lab.tsx"),"utf8");
 const header=fs.readFileSync(path.join(base,"src/components/site-shell.tsx"),"utf8");
 const study=fs.readFileSync(path.join(base,"reports/hair-tryon-research-2026-11-02.md"),"utf8");
 assert.ok(page.includes('import catalog from "@/data/products.json"'));
 assert.ok(page.includes("robots:{index:false"));
 assert.ok(header.includes("href=\"/haar-anprobe/\""));
 for(const marker of ["URL.createObjectURL","URL.revokeObjectURL","image/jpeg","image/png","image/webp","maximal 8 MB", "setRatio", "Saçımda Dene", "RUBY HAIR"]){
   assert.ok(lab.includes(marker),marker);
 }
 for(const marker of ["fetch(\"/api/tryon/generate\"","new FormData()","consent","testCode","shrinkImage(before.file)"]){
   assert.ok(lab.includes(marker),"Protected generation flow missing: "+marker);
 }
 for(const forbidden of ["localStorage","sessionStorage","/api/generate"]){
   assert.ok(!lab.includes(forbidden),"No persistent photo storage or unreviewed endpoints: "+forbidden);
 }
 const api=fs.readFileSync(path.join(base,"app/api/tryon/generate/route.ts"),"utf8");
 for(const marker of ["RUBY_TRYON_TEST_CODE","OPENAI_API_KEY","sessionLimited","form.get(\"consent\")","authorized(form.get(\"testCode\"))","gpt-image-2.5-sunburst","image[]","no-store, private"]){
   assert.ok(api.includes(marker),"Server-side guard missing: "+marker);
 }
 assert.ok(!lab.includes("OPENAI_API_KEY"),"Never expose provider key in the browser");
 assert.ok(study.includes("Keratin"));
 assert.ok(study.includes("Tape-in"));
 assert.ok(study.includes("Perfect Corp"));
 assert.ok(fs.existsSync(path.join(base,"src/styles/tryon.css")));
});
