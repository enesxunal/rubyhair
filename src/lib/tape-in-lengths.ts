// Public Tape-in storefront groups. Keratin product records remain intact for legacy URLs.
export const tapeInLengths = [
  {key:"45-50-cm", label:"45–50 cm", title:"Tape-in Kurz", image:"/media/tape-in-extensions-bg-17a4f5094.png", alt:"Ruby Hair Tape-in Echthaar Extensions – kurze Variante"},
  {key:"55-60-cm", label:"55–60 cm", title:"Tape-in Lang", image:"/media/60-3-scaled-e99a55c0d.jpg", alt:"Ruby Hair Tape-in Echthaar Extensions – lange Variante"}
] as const;
export const tapeInLengthHref=(length:string)=>"/kollektionen/tape-in-extensions/?laenge="+encodeURIComponent(length);
