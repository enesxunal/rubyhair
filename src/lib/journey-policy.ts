import {z} from "zod";
import {diagnosticMethods,diagnosticStages,browserDiagnosticCodes} from "./checkout-diagnostic-policy";
export const journeyConsentVersion="journey-v1";
export const journeyStorageKey="ruby_journey_tab_v1";
export const journeyConsentKey="ruby_journey_choice_v1";
export const journeyIdleMs=30*60*1000;
export const journeyRetentionMs=7*24*60*60*1000;
export const journeyMethods=diagnosticMethods;
export const journeyEvents=["product_view","add_to_cart","cart_view","begin_checkout","address_ready","payment_selected","payment_attempt","error"] as const;
export const journeySchema=z.object({
 session:z.string().uuid(), id:z.string().uuid(),event:z.enum(journeyEvents),
 method:z.enum(diagnosticMethods).optional(),stage:z.enum(diagnosticStages).optional(),
 code:z.enum(browserDiagnosticCodes).optional(),
 source:z.enum(["direct","search","social","referral","internal","meta_paid","meta_post","meta_reels"]).optional(),
 device:z.enum(["mobile","desktop"]).optional()
}).strict().superRefine((d,c)=>{
 if(d.event==="error"&&(!d.method||!d.stage||!d.code))c.addIssue({code:"custom",message:"missing error fields"});
 if((d.event==="payment_selected"||d.event==="payment_attempt")&&(!d.method||d.method==="unknown"))c.addIssue({code:"custom",message:"missing payment method"});
 if(d.event!=="error"&&(d.code||d.stage))c.addIssue({code:"custom",message:"unexpected error fields"});
});
export type JourneyEvent=z.infer<typeof journeySchema>;
