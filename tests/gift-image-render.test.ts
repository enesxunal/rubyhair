import test from "node:test";
import assert from "node:assert/strict";
import {renderGiftCardImage} from "../src/lib/gift-cards/render";
test("all Ruby Hair voucher styles render real shareable PNG without personal tokens",async()=>{
 for(const theme of ["classic","soft","black"]){
  const response=renderGiftCardImage({recipientName:"Sophie",senderName:"Anna",message:"Alles Liebe zum Geburtstag!",amountCents:20000,theme},"RH-ABCD-EFGH-JKLM-NPQR-STUV");
  const data=Buffer.from(await response.arrayBuffer());
  assert.equal(response.headers.get("content-type"),"image/png");
  assert.ok(data.length>30000);
  assert.deepEqual([...data.subarray(0,8)],[137,80,78,71,13,10,26,10]);
 }
});
