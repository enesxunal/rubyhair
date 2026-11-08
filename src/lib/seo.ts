/** Strict launch gate. The demo always remains noindex and never claims in-stock offers. */
export const publicShopEnabled=()=>
 process.env.RUBY_SHOP_PUBLIC==="APPROVED_PRODUCTION" &&
 process.env.RUBY_CANONICAL_SITE_URL==="https://rubyhair.de";
export const siteOrigin=()=>publicShopEnabled()?"https://rubyhair.de":"https://rubyhair.vercel.app";
export const absoluteSiteUrl=(path:string)=>siteOrigin()+path;
