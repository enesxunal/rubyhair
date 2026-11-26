import test from "node:test";
import assert from "node:assert/strict";
import {CART_RECOVERY_CONSENT,recoveryRequest,recoveryToken,recoveryId,nextReminder,maySendReminder} from "../src/lib/cart-recovery-policy";
const now=new Date(),id="6f73b55b-a6c3-465e-af15-5c6e7c18fbdd",secret="a".repeat(32);
test("explicit opt-in and bounded physical cart payload required",()=>{
 const input={email:"qa@example.com",consent:true,lines:[{id:883,quantity:1}]};
 assert.ok(recoveryRequest.safeParse(input).success);
 for(const patch of [{consent:false},{lines:[]},{lines:[{id:883,quantity:1},{id:883,quantity:1}]},{lines:[{id:883,quantity:1,price:0}]}])assert.equal(recoveryRequest.safeParse({...input,...patch}).success,false);
});
test("signed recovery link cannot be forged",()=>{
 const token=recoveryToken(secret,id);assert.equal(recoveryId(secret,token),id);assert.equal(recoveryId("b".repeat(32),token),null);assert.equal(recoveryId(secret,token.slice(0,-1)+"z"),null);
});
test("only confirmed, due, non-purchased carts can receive reminders",()=>{
 const row={status:"confirmed",confirmedAt:new Date(now.getTime()-3600000),expiresAt:new Date(now.getTime()+10000),sentCount:0,nextReminderAt:now,consentVersion:CART_RECOVERY_CONSENT};
 assert.equal(maySendReminder(row,now,false),true);
 assert.equal(maySendReminder(row,now,true),false);
 for(const patch of [{status:"unconfirmed"},{status:"unsubscribed"},{confirmedAt:null},{sentCount:3},{expiresAt:now},{consentVersion:"old"}])assert.equal(maySendReminder({...row,...patch},now,false),false);
 assert.equal(nextReminder(now,0)!.getTime()-now.getTime(),3600000);
 assert.equal(nextReminder(now,1)!.getTime()-now.getTime(),86400000);
 assert.equal(nextReminder(now,2)!.getTime()-now.getTime(),172800000);
 assert.equal(nextReminder(now,3),null);
});
