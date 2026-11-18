/** Public catalog released only on the production deployment.
 * Branch previews and local builds remain noindex. */
export const publicShopEnabled=()=>
 process.env.VERCEL_ENV==="production" &&
 process.env.RUBY_SHOP_PUBLIC==="APPROVED_PRODUCTION" &&
 process.env.RUBY_CANONICAL_SITE_URL==="https://rubyhair.de";
export const siteOrigin=()=>publicShopEnabled()?"https://rubyhair.de":"https://rubyhair.vercel.app";
export const absoluteSiteUrl=(path:string)=>siteOrigin()+path;
