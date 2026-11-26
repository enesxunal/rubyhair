import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {browserDiagnosticCodes,diagnosticLabels,safeDiagnosticCode} from "../src/lib/checkout-diagnostic-policy";
test("error protocol never accepts arbitrary sensitive values",()=>{
 for(const code of browserDiagnosticCodes)assert.ok(diagnosticLabels[code]);
 for(const value of ["someone@example.com","4111111111111111","token=secret","__proto__",null])assert.equal(safeDiagnosticCode(value),"UNKNOWN_ERROR");
 assert.equal(safeDiagnosticCode("STOCK_CHANGED"),"STOCK_CHANGED");
});
test("browser endpoint is strict, rate limited and cannot link a supplied order",()=>{
 const route=readFileSync("app/api/checkout/diagnostic/route.ts","utf8");
 assert.match(route,/\.strict\(\)/);assert.match(route,/publicRequestAllowed/);assert.match(route,/512/);
 assert.doesNotMatch(route,/orderId|paymentToken|req\.headers\.get\("cookie"/);
});
test("capture rejection logs do not recurse or change response and follow signature validation",()=>{
 for(const name of ["card-capture","wallet-capture"]){
 const route=readFileSync("app/api/payments/paypal/"+name+"/route.ts","utf8");
 assert.match(route,/const reject=.*return NextResponse\.json\(\{error:code\},\{status,headers\}\)/);
 assert.ok(route.indexOf("const reject=")>route.indexOf("if(!verify"));
 }
});
