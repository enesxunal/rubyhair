// Public Tape-in storefront groups. Keratin product records remain intact for legacy URLs.
export const tapeInLengths = [
  {key:"45-50-cm", label:"45–50 cm", title:"Tape-in 45–50 cm", image:"/media/tape-in-short-editorial.webp", alt:"Ruby Hair Tape-in Echthaar Extensions – 45–50 cm"},
  {key:"55-60-cm", label:"55–60 cm", title:"Tape-in 55–60 cm", image:"/media/tape-in-long-editorial.webp", alt:"Ruby Hair Tape-in Echthaar Extensions – 55–60 cm"}
] as const;
export const tapeInLengthHref=(length:string)=>"/kollektionen/tape-in-extensions/?laenge="+encodeURIComponent(length);
