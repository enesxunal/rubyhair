/**
 * Ruby Hair originals supplied by the merchant on 19 November 2026.
 * Matching is by real, catalogued color code only; never guess the length
 * from an unlabeled editorial photo. All quantities/prices remain database-driven.
 */
export const customerTapePhotos=[
 {code:"ari",name:"Ari",image:"/assets/ruby-tape-ari-main.webp",alternate:null},
 {code:"banu",name:"Banu",image:"/assets/ruby-tape-banu-main.webp",alternate:"/assets/ruby-tape-banu-alt.webp"},
 {code:"ruby",name:"Ruby",image:"/assets/ruby-tape-ruby-main.webp",alternate:"/assets/ruby-tape-ruby-alt.webp"},
 {code:"bronde",name:"Bronde",image:"/assets/ruby-tape-bronde-main.webp",alternate:"/assets/ruby-tape-bronde-alt.webp"},
 {code:"loui",name:"Loui",image:"/assets/ruby-tape-loui-main.webp",alternate:"/assets/ruby-tape-loui-alt.webp"}
] as const;
export function customerTapePhoto(slug:string,color:string){
 if(slug!=="tape-in-extensions")return null;
 return customerTapePhotos.find(p=>p.code===color.toLowerCase())||null;
}
export function customerTapeMainImage(slug:string,color:string,fallback:string){
 return customerTapePhoto(slug,color)?.image||fallback;
}
export function customerTapeAltImage(slug:string,color:string){
 return customerTapePhoto(slug,color)?.alternate||null;
}
