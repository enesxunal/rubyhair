import { PrismaClient } from "@prisma/client";
import data from "../src/data/products.json";

async function main() {
  if (process.env.SEED_CONFIRM !== "RUBY_HAIR_IMPORTED_SNAPSHOT") {
    throw new Error("Refusing to import until SEED_CONFIRM=RUBY_HAIR_IMPORTED_SNAPSHOT is supplied");
  }
  const prisma = new PrismaClient();
  try {
    let variants = 0;
    for (const item of Object.values(data.products)) {
      const product = await prisma.product.upsert({
        where: { slug: item.slug },
        update: {}, // never overwrite manually edited data on repeated import
        create: {
          legacyId: item.id,
          slug: item.slug,
          name: item.name,
          originalName: item.original_name,
          headline: item.headline,
          intro: item.intro,
          pack: item.pack,
          material: item.material,
          currency: item.currency,
          image: item.image,
          active: true
        }
      });
      for (const v of item.variations) {
        await prisma.variant.upsert({
          where: { legacyId: v.id },
          update: {},
          create: {
            productId: product.id,
            legacyId: v.id,
            colorCode: v.color,
            colorLabel: v.color_label,
            lengthCode: v.length,
            lengthLabel: v.length_label,
            priceCents: Math.round(v.price * 100),
            stockQuantity: null, // stock count unknown; do not infer from available status
            active: Boolean(v.available && v.purchasable),
            image: v.image
          }
        });
        variants++;
      }
    }
    console.log("Seed complete:",Object.keys(data.products).length,"products",variants,"variants; physical stock counts unverified.");
  } finally {
    await prisma.$disconnect();
  }
}
main().catch(error=>{console.error(error);process.exit(1)});
