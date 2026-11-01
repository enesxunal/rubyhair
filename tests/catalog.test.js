const test = require("node:test");
const assert = require("node:assert/strict");
const { __test: catalog } = require("../api/catalog.js");
const snapshot = require("../shop-data.json");

test("safe public image domain", () => {
  assert.ok(catalog.safeImage("https://rubyhair.de/wp-content/uploads/2023/12/banu.jpg"));
  assert.equal(catalog.safeImage("https://bad.example/wp-content/uploads/banu.jpg"), null);
  assert.equal(catalog.safeImage("javascript:alert(1)"), null);
  assert.equal(catalog.safeImage("https://rubyhair.de.evil.invalid/wp-content/uploads/img.jpg"), null);
});
test("encoded WooCommerce attribute JSON parsing", () => {
  const raw = '<form data-product_variations="[{&quot;variation_id&quot;:123,&quot;display_price&quot;:145}]">';
  assert.equal(catalog.getVariations(raw)[0].variation_id, 123);
  assert.throws(() => catalog.getVariations('data-product_variations="false"'));
  assert.equal(catalog.decodeAttribute("&quot;RUBY&amp;HAIR&quot;"), '"RUBY&HAIR"');
});
test("all snapshot variants have accurate typed fields and allowed image paths", () => {
  assert.deepEqual(Object.keys(snapshot.products).sort(), ["keratin-bondings","tape-in-extensions"]);
  for (const item of Object.values(snapshot.products)) {
    assert.ok(item.variations.length >= 10);
    for (const variant of item.variations) {
      assert.equal(typeof variant.price, "number");
      assert.ok(variant.price > 0);
      assert.ok(catalog.safeImage(variant.image));
      assert.ok(variant.color);
      assert.ok(variant.length);
    }
  }
});
test("upstream product-level purchase ban disables every variation", () => {
  const previous = snapshot.products["keratin-bondings"];
  const known = previous.variations[0];
  const product = {
    id:previous.id,type:"variable",is_purchasable:false,
    prices:{currency_code:"EUR"},images:[{thumbnail:previous.image}],
    attributes:[
      {name:"Farbe",terms:[{slug:known.color,name:known.color_label}]},
      {name:"Länge",terms:[{slug:known.length,name:known.length_label}]}
    ]
  };
  const source = Array.from({length:3},(_,i)=>({
    variation_id:1000+i,
    attributes:{attribute_pa_produktfarbe:known.color,attribute_pa_produktlaenge:known.length},
    display_price:145, is_in_stock:true,is_purchasable:true,image:{src:known.image}
  }));
  const actual=catalog.cleanProduct(product,source,previous);
  assert.ok(actual.variations.every(variant=>!variant.purchasable));
});
