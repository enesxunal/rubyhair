import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(p:string)=>readFileSync(p,"utf8");

test("out-of-stock shades cannot link to a product or purchase",()=>{
 const grid=read("src/components/shade-grid.tsx");
 const product=read("src/components/product-detail.tsx");
 const home=read("src/components/home-frontend.tsx");
 assert.match(grid,/card.status==="unavailable"\?"AUSVERKAUFT"/);
 assert.match(grid,/card.status!=="unavailable"&&<Link/);
 assert.match(product,/!inStock\?"Ausverkauft"/);
 assert.match(product,/disabled={!inStock\|\|quantity>stockLimit}/);
 assert.match(product,/selected\?\.stock_quantity/);
 assert.match(home,/canBuy\?<Link/);
 assert.match(home,/AUSVERKAUFT/);
});

test("admin shows stock next to price and persists numeric stock with concurrency checks",()=>{
 const admin=read("src/components/admin-variant-bulk.tsx");
 const action=read("app/admin/actions.ts");
 assert.match(admin,/<th>Preis \(EUR\)<\/th><th>Bestand \(Stück\)<\/th>/);
 assert.match(admin,/name={v.id\+":stockQuantity"}/);
 assert.match(admin,/Ausverkauft/);
 assert.match(action,/stockQuantity:stockQuantity===""\?null:stockQuantity/);
 assert.match(action,/current.stockQuantity!==v.beforeStock/);
});

test("WooCommerce snapshot importer protects active new shop orders and QA variants",()=>{
 const script=read("scripts/sync-legacy-inventory-20261118.cjs");
 assert.match(script,/realOrdersDeducted/);
 assert.match(script,/testOnly:false/);
 assert.match(script,/Math.max\(0,legacy-reservation\)/);
 assert.match(script,/qaSkipped/);
 assert.match(script,/INVENTORY_CHANGED_DURING_PREFLIGHT/);
 assert.match(script,/Serializable/);
 assert.match(script,/BACKUP_WRITTEN/);
});
