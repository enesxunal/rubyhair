/**
 * Read-only Ruby Hair public catalog endpoint.
 * Retrieves published WooCommerce Store API products and the public
 * WooCommerce variation form, without any admin keys or private endpoints.
 * The existing checkout remains on rubyhair.de.
 */
const snapshot = require("../shop-data.json");

const ORIGIN = "https://rubyhair.de";
const PRODUCTS = Object.freeze([
  { slug: "tape-in-extensions", id: 882 },
  { slug: "keratin-bondings", id: 852 }
]);
const MAX_AGE_SECONDS = 300;

function decodeAttribute(input) {
  return input
    .replace(/&quot;|&#34;|&#x22;/gi, '"')
    .replace(/&apos;|&#39;|&#x27;/gi, "'")
    .replace(/&lt;|&#60;|&#x3c;/gi, "<")
    .replace(/&gt;|&#62;|&#x3e;/gi, ">")
    .replace(/&amp;|&#38;|&#x26;/gi, "&");
}
function getVariations(html) {
  const match = html.match(/data-product_variations="([^"]+)"/);
  if (!match) throw new Error("Variation source missing");
  const records = JSON.parse(decodeAttribute(match[1]));
  if (!Array.isArray(records) || records.length === 0 || records.length > 300) throw new Error("Invalid variation source");
  return records;
}
function safeImage(url) {
  if (typeof url !== "string") return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" &&
      parsed.hostname === "rubyhair.de" &&
      parsed.pathname.startsWith("/wp-content/uploads/")
      ? parsed.href : null;
  } catch { return null; }
}
function labelMap(p, attributeName) {
  const a = p.attributes.find(entry => entry.name === attributeName);
  if (!a || !Array.isArray(a.terms)) throw new Error("Variation attribute missing: " + attributeName);
  return new Map(a.terms.map(v => [String(v.slug).toLowerCase(), String(v.name)]));
}
function cleanProduct(p, raw, previous) {
  if (p.id !== previous.id || p.type !== "variable" ||
      p.prices?.currency_code !== "EUR") {
    throw new Error("Unexpected published product data");
  }
  const colorNames = labelMap(p, "Farbe");
  const lengthNames = labelMap(p, "Länge");
  const variations = raw.map(v => {
    const color = String(v.attributes?.attribute_pa_produktfarbe || "").toLowerCase();
    const length = String(v.attributes?.attribute_pa_produktlaenge || "").toLowerCase();
    if (!colorNames.has(color) || !lengthNames.has(length)) throw new Error("Unknown product variation");
    const price = Number(v.display_price);
    if (!Number.isFinite(price) || price <= 0 || !Number.isInteger(v.variation_id)) {
      throw new Error("Invalid variation price/id");
    }
    return {
      id: v.variation_id, color, length,
      color_label: colorNames.get(color), length_label: lengthNames.get(length),
      price, available: Boolean(v.is_in_stock), purchasable: Boolean(v.is_purchasable && p.is_purchasable),
      image: safeImage(v.image?.src) || safeImage(p.images?.[0]?.thumbnail) || previous.image
    };
  });
  if (variations.length < 3) throw new Error("Too few product variations");
  const unique = new Set(variations.map(v => v.id));
  if (unique.size !== variations.length) throw new Error("Duplicate variation IDs");
  const prices = variations.map(v => v.price);
  return {
    ...previous,
    min_price: Math.min(...prices),
    max_price: Math.max(...prices),
    image: safeImage(p.images?.[0]?.thumbnail) || previous.image,
    variations
  };
}
async function fetchText(url) {
  const response = await fetch(url, {
    headers: { accept: "text/html,application/json", "user-agent": "RubyHair-Preview-Catalog/1.0" },
    signal: AbortSignal.timeout(12000),
    redirect: "error"
  });
  if (!response.ok) throw new Error("Source request failed (" + response.status + ")");
  return response.text();
}
async function fetchProduct(entry) {
  const previous = snapshot.products[entry.slug];
  if (!previous) throw new Error("Unknown local product");
  const [dataText, html] = await Promise.all([
    fetchText(ORIGIN + "/wp-json/wc/store/v1/products/" + entry.id),
    fetchText(ORIGIN + "/produkt/" + entry.slug + "/")
  ]);
  return cleanProduct(JSON.parse(dataText), getVariations(html), previous);
}
async function buildCatalog() {
  const records = await Promise.all(PRODUCTS.map(fetchProduct));
  return {
    synced_at: new Date().toISOString(),
    source: "live",
    products: Object.fromEntries(PRODUCTS.map((entry, index) => [entry.slug, records[index]]))
  };
}
async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const data = await buildCatalog();
    res.setHeader("Cache-Control", "public, s-maxage=" + MAX_AGE_SECONDS + ", stale-while-revalidate=600");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.status(200).json(data);
  } catch (error) {
    console.error("Public Ruby Hair catalog request failed:", error.message);
    res.setHeader("Cache-Control", "no-store");
    return res.status(503).json({ error: "Live catalog unavailable" });
  }
}
module.exports = handler;
module.exports.__test = { decodeAttribute, getVariations, safeImage, cleanProduct, buildCatalog };
