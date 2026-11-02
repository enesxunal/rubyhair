/** Pure order-state policy. This is NOT wired to public checkout, payment or admin. */
export const orderStates={
  draft:"Entwurf",
  pending_payment:"Zahlung ausstehend",
  payment_confirmed:"Zahlung bestätigt",
  preparing:"In Bearbeitung",
  shipped:"Versendet",
  delivered:"Zugestellt",
  cancelled:"Storniert",
  refunded:"Erstattet",
  test_reserved:"Testreservierung",
  test_cancelled:"Testreservierung storniert",
  test_expired:"Testreservierung abgelaufen"
} as const;
export type OrderState=keyof typeof orderStates;
export type OrderActor="checkout"|"payment_provider"|"fulfillment"|"system"|"local_test";

/** A payment confirmation can only originate from a future verified provider callback. */
const rules:Partial<Record<OrderState,Partial<Record<OrderState,OrderActor[]>>>>={
  draft:{pending_payment:["checkout"],cancelled:["system"]},
  pending_payment:{payment_confirmed:["payment_provider"],cancelled:["system"]},
  payment_confirmed:{preparing:["fulfillment"],refunded:["payment_provider"]},
  preparing:{shipped:["fulfillment"],cancelled:["fulfillment"],refunded:["payment_provider"]},
  shipped:{delivered:["fulfillment"],refunded:["payment_provider"]},
  delivered:{refunded:["payment_provider"]},
  test_reserved:{test_cancelled:["local_test"],test_expired:["local_test"]}
};
export const isKnownOrderState=(value:string):value is OrderState=>
  Object.prototype.hasOwnProperty.call(orderStates,value);
export function canTransitionOrder(from:string,to:string,actor:OrderActor):boolean{
  if(!isKnownOrderState(from)||!isKnownOrderState(to)||from===to)return false;
  return rules[from]?.[to]?.includes(actor)===true;
}
export function requireOrderTransition(from:string,to:string,actor:OrderActor){
  if(!canTransitionOrder(from,to,actor)){
    throw new Error("ORDER_TRANSITION_FORBIDDEN: "+from+" -> "+to+" by "+actor);
  }
}
