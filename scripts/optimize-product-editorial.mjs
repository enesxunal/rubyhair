import sharp from 'sharp';
import {readFileSync,statSync} from 'node:fs';
import {join} from 'node:path';
const media=join(process.cwd(),'public/media');
const entries=[
 ['tape-in-extensions-bg-17a4f5094.png','tape-in-short-editorial.webp',950],
 ['60-3-scaled-e99a55c0d.jpg','tape-in-long-editorial.webp',950]
];
for(const [source,target,width] of entries){
  const input=join(media,source),output=join(media,target);
  // Only editorial cards: do not modify/convert the original shade swatches.
  await sharp(input).rotate().resize({width,withoutEnlargement:true})
   .webp({quality:85,effort:6}).toFile(output);
  console.log(`${source} -> ${target}: ${statSync(input).size} -> ${statSync(output).size} bytes`);
}
const d=JSON.parse(readFileSync('src/data/products.json','utf8')).products;
const tape=d['tape-in-extensions'];
const uniqueImages=new Set(tape.variations.map(x=>x.image));
const summary=[
 '# Ruby Hair — Fotoğraf kalite ve kaynak denetimi (8 Kasım 2026)',
 '',
 '- Tüm ham ürün renk fotoğrafları önceki Ruby Hair ürün kataloğundan geldi. **Henüz müşteri onaylı fotoğraf seti değildir.**',
 `- Tape-in: ${tape.variations.length} gerçek renk/uzunluk varyantı, ${uniqueImages.size} farklı varyant fotoğrafı.`,
 '- Aynı renk görseli birden fazla uzunlukta kullanılmış olabilir. Fotoğrafın gerçek uzunluğu temsil ettiği varsayılmayacak.',
 '- Önceki Tape-in genel ürün kapağı, Keratin ürününe ait olabilecek 300×400 piksellik `1006-2` dosyasını kullanıyordu. Onun yerine mevcut Tape-in kategori fotoğrafının kayıpsız kaynak dosyasından türetilen WebP kullanıldı.',
 '- Kısa ve uzun editorial kategori görselleri yalnızca tasarım amaçlı; uzunluğu ölçen veya mevcut stoğu gösteren kanıt değildir.',
 '- Gerçek renk örnekleri **değiştirilmedi**, filtre uygulanmadı, yapay saç rengi üretilmedi.',
 '',
 '## Almanya müşteri onayında kontrol edilecekler',
 '- Her Tape-in renk için doğru swatch, SKU/renk adı, ürün uzunluğu ve gerçek stok.',
 '- 45–50 ve 55–60 cm için ayrı temsil fotoğrafı; mümkünse renk eşleşen gerçek paket çekimi.',
 '- Beyaz fon: gerçek paket, bant bağlantısı ve saç boyu; lifestyle: aynı ışık ve doğal saç rengiyle before/after.',
 '- Kullanım izni/çekim kaynak bilgisi; sahte uygulama sonucu ve yanlış ürün fotoğrafı kullanılmamalı.',
 '',
 '## Örnekler',
 '| Kullanım | Kaynak | Hedef |',
 '|---|---|---|',
 '| Tape-in kısa editorial | tape-in-extensions-bg-17a4f5094.png | tape-in-short-editorial.webp |',
 '| Tape-in uzun editorial | 60-3-scaled-e99a55c0d.jpg | tape-in-long-editorial.webp |'
];
await import('node:fs/promises').then(fs=>fs.writeFile('reports/product-media-audit-2026-11-08.md',summary.join('\n')+'\n'));
