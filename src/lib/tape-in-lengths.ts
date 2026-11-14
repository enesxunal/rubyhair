// Public Tape-in storefront groups. Keratin product records remain intact for legacy URLs.
export const tapeInLengths = [
  {key:"45-50-cm", label:"45–50 cm", title:"Tape-in 45–50 cm", image:"/assets/ruby-hair-platinum-atelier.webp", alt:"Ruby Hair Tape-in Echthaar Extensions – 45–50 cm"},
  {key:"55-60-cm", label:"55–60 cm", title:"Tape-in 55–60 cm", image:"/media/6-1-scaled-ffe6f9676.jpg", alt:"Ruby Hair Tape-in Echthaar Extensions in Braun – 55–60 cm"}
] as const;
export const tapeInLengthHref=(length:string)=>"/kollektionen/tape-in-extensions/?laenge="+encodeURIComponent(length);
