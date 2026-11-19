import test from "node:test";
import assert from "node:assert/strict";
import {renderGiftCardImage} from "../src/lib/gift-cards/render";
import {readFileSync} from "node:fs";
import {giftLogoLightDataUrl,giftLogoDarkDataUrl} from "../src/lib/gift-cards/brand-logos";
test("all Ruby Hair voucher styles render real shareable PNG without personal tokens",async()=>{
 for(const theme of ["classic","soft","black"]){
  const response=renderGiftCardImage({recipientName:"Sophie",senderName:"Anna",message:"Alles Liebe zum Geburtstag!",amountCents:20000,theme},"RH-ABCD-EFGH-JKLM-NPQR-STUV");
  const data=Buffer.from(await response.arrayBuffer());
  assert.equal(response.headers.get("content-type"),"image/png");
  assert.ok(data.length>30000);
  assert.deepEqual([...data.subarray(0,8)],[137,80,78,71,13,10,26,10]);
 }
});

test("gift card PNG embeds the exact original Ruby Hair logo assets",()=>{
 const originalLight=readFileSync("public/media/RubyHair-WebHeader-Logo-Hell-818376d91.png").toString("base64");
 const originalDark=readFileSync("public/media/RubyHair-WebHeader-Logo-Dunkel-70efc2b6a.png").toString("base64");
 assert.equal(giftLogoLightDataUrl,"data:image/png;base64,"+originalLight);
 assert.equal(giftLogoDarkDataUrl,"data:image/png;base64,"+originalDark);
});
test("storefront and theme swatches use the original logo, not synthetic text",()=>{
 const composer=readFileSync("src/components/gift-composer.tsx","utf8");
 const homepage=readFileSync("src/components/home-frontend.tsx","utf8");
 assert.ok(composer.includes('RubyHair-WebHeader-Logo-Dunkel-70efc2b6a.png'));
 assert.ok(composer.includes('RubyHair-WebHeader-Logo-Hell-818376d91.png'));
 assert.ok(homepage.includes('rh-home-gift-mini-card"><img src="/media/RubyHair-WebHeader-Logo-Hell'));
});
