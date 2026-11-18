/** Pure, deliberately conservative policy used for provider callback replays.
 * A paid/shipped/refunded order may be acknowledged only when we already hold
 * a durable invoice and a verified capture event from the SAME provider.
 */
const finalized=new Set(["payment_confirmed","preparing","shipped","delivered","refunded"]);
export function verifiedCaptureReplay(status:string,hasInvoice:boolean,hasProviderCapture:boolean){
 return finalized.has(status)&&hasInvoice&&hasProviderCapture;
}
export function paymentReplayOutcome(status:string):"paid"|"refunded"{
 return status==="refunded"?"refunded":"paid";
}
