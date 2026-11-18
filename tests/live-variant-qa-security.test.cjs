const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=(p)=>fs.readFileSync(path.join(root,p),"utf8");

test("the only live price test uses existing Tape-in 45-50 Farbe 4 and no new product",()=>{
 const core=read("src/lib/live-variant-qa.ts");
 assert.match(core,/VARIANT_TEST_LEGACY_ID=886/);
 assert.match(core,/VARIANT_TEST_PRODUCT="tape-in-extensions"/);
 assert.match(core,/VARIANT_TEST_COLOR="4"/);
 assert.match(core,/VARIANT_TEST_LENGTH="45-50-cm"/);
 assert.match(core,/VARIANT_TEST_ORIGINAL_CENTS=14000/);
 assert.match(core,/VARIANT_TEST_CENTS=100/);
 assert.match(core,/variant\.priceCents!==VARIANT_TEST_CENTS/);
 assert.match(core,/variant\.stockQuantity!==1/);
 assert.doesNotMatch(core,/tx\.product\.(create|upsert)\(/);
});

test("administrator-only test checkout, exact money and separate public checkout",()=>{
 const actions=read("app/live-variant-test-actions.ts");
 const core=read("src/lib/live-variant-qa.ts");
 const page=read("app/kasse/page.tsx");
 const blocked=read("app/api/checkout/route.ts");
 assert.match(actions,/if\(!await isAdmin\(\)\)/);
 assert.match(actions,/form\.get\("variationId"\)!=="886"/);
 assert.match(actions,/form\.get\("confirmCapture"\)!=="on"/);
 assert.match(page,/const admin=await isAdmin\(\)/);
 assert.match(page,/p\.liveTest==="1"&&!admin/);
 assert.match(page,/redirect\("\/admin\/login"\)/);
 assert.match(page,/s\.ready\|\|s\.pending\|\|s\.completed/);
 assert.match(page,/s\.pending\?\.paymentReference===supplied/);
 assert.match(core,/createOneEuroQaOrder\(/);
 assert.match(core,/shippingCents:0/);
 assert.match(core,/testOnly:true/);
 assert.match(core,/stockQuantity:\{decrement:1\}/);
 assert.match(core,/isolationLevel:Prisma\.TransactionIsolationLevel\.Serializable/);
 assert.match(core,/requireCompletedCapture\(raw,order\.id,100,paypalOrderId\)/);
 assert.match(core,/providerEventId:captured\.captureId/);
 assert.match(core,/data:\{priceCents:VARIANT_TEST_ORIGINAL_CENTS,stockQuantity:null\}/);
 assert.match(core,/return tx\.invoice\.create\(/);
 assert.match(blocked,/CHECKOUT_NOT_CONFIGURED/);
 assert.match(blocked,/status:503/);
});

test("PayPal return is inert until manual capture and unrelated QA remains separate",()=>{
 const callback=read("app/qa/paypal/return/page.tsx");
 const ui=read("src/components/live-variant-test-section.tsx");
 const actions=read("app/live-variant-test-actions.ts");
 assert.match(callback,/data\.variantTest==="1"/);
 assert.match(callback,/\/kasse\?liveTest=1&paypalToken=/);
 assert.match(callback,/\/admin\/testbestellung\?paypalToken=/);
 assert.doesNotMatch(callback,/captureOrder/);
 assert.match(ui,/confirmation|bestätigt/i);
 assert.match(ui,/1,00 € jetzt endgültig einziehen/i);
 assert.match(ui,/startLiveVariantTestAction/);
 assert.match(ui,/captureLiveVariantTestAction/);
 assert.match(ui,/cancelLiveVariantTestAction/);
 assert.match(actions,/beginVariantTest/);
 assert.match(actions,/captureVariantTest/);
});

test("checkout payment buttons are selectable and admin login can return to 1 EUR checkout",()=>{
 const checkout=read("src/components/checkout-preview.tsx");
 const loginPage=read("app/admin/login/page.tsx");
 const loginRoute=read("app/api/admin/login/route.ts");
 assert.match(checkout,/type="radio" name="checkout-payment-method" value="paypal"/);
 assert.match(checkout,/type="radio" name="checkout-payment-method" value="klarna"/);
 assert.match(checkout,/paymentMethod==="paypal"&&liveTest/);
 assert.match(checkout,/LiveVariantTestSection state=\{liveTest\}/);
 assert.match(checkout,/Mit Admin-Konto anmelden und PayPal testen/);
 assert.match(checkout,/Klarna-Zahlung.*noch nicht/);
 assert.doesNotMatch(checkout,/button type="button" disabled aria-disabled="true"/);
 assert.match(loginPage,/checkoutReturn=next==="live-checkout"/);
 assert.match(loginPage,/name="next" value="live-checkout"/);
 assert.match(loginRoute,/form.get\("next"\)==="live-checkout"/);
 assert.match(loginRoute,/checkoutReturn\?"\/kasse\?liveTest=1":"\/admin"/);
});
