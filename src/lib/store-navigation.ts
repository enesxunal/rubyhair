import {tapeInLengthHref} from "@/lib/tape-in-lengths";
/** Single source of truth for both the editorial homepage and shop shell.
 * Visual classes remain different; hrefs and labels remain aligned. */
export const storefrontNav=[
 {href:"/kollektionen/",label:"Alle Extensions",homeLabel:"ALLE EXTENSIONS"},
 {href:tapeInLengthHref("45-50-cm"),label:"Tape-in 45–50 cm",homeLabel:"TAPE-IN 45–50 CM"},
 {href:tapeInLengthHref("55-60-cm"),label:"Tape-in 55–60 cm",homeLabel:"TAPE-IN 55–60 CM"},
 {href:"/suche/",label:"Haarfarben",homeLabel:"HAARFARBEN"},
 {href:"/kontakt/",label:"Beratung",homeLabel:"BERATUNG"}
] as const;
export const storefrontShopLinks=[
 {href:"/kollektionen/",label:"Alle Extensions"},
 {href:tapeInLengthHref("45-50-cm"),label:"Tape-in 45–50 cm"},
 {href:tapeInLengthHref("55-60-cm"),label:"Tape-in 55–60 cm"},
 {href:"/suche/",label:"Haarfarben entdecken"}
] as const;
export const storefrontInfoLinks=[
 {href:"/ratgeber/",label:"Hair Guide & Pflege"},
 {href:"/kontakt/",label:"Kontakt & Beratung"},
 {href:"/versand-zahlung/",label:"Versand & Zahlung"},
 {href:"/rechtliches/widerruf/",label:"Widerruf & Rückgabe"},
 {href:"/widerruf/",label:"Vertrag widerrufen"},
 {href:"/rechtliches/agb/",label:"AGB"}
] as const;
