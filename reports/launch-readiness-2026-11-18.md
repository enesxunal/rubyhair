# Ruby Hair — Güncel Canlı Yayın Durumu ve Denetim Kanıtları (18 Kasım 2026)

**Güncel karar: MÜŞTERİ TALEBİYLE KONTROLLÜ CANLI SATIŞ AÇIK.** `rubyhair.de` ve PayPal/Klarna müşteri kasası açıktır (`RUBY_PUBLIC_CHECKOUT_MODE=payments_public`). Bu durum, aşağıdaki açık konular için koşulsuz güvenlik/hukuk onayı anlamına gelmez.

**Üretim kapısı:** Vercel production, `RUBY_SHOP_PUBLIC=APPROVED_PRODUCTION` ve `RUBY_CANONICAL_SITE_URL=https://rubyhair.de` birlikte gereklidir. Bu değişkenler 18.11.2026'da production'a eklendi. Ödeme durdurma mekanizması `RUBY_PUBLIC_CHECKOUT_MODE=disabled` ile ayrı olarak uygulanır; Vercel deployment gerektirebilir. Gerçek kapatma/geri-açma tatbikatı müşteri ödemelerini kesmemek için yapılmadı.

## Kanıt matrisi — mevcut doğrulanmış durum

| İşlem | Son kanıt | Sonuç |
| --- | --- | --- |
| Canlı katalog / fiziksel stok | PostgreSQL katalog; 17 Kasım WooCommerce snapshot eşitleme, stok 0 varyantlar engelleniyor | PASS (sürekli WooCommerce senkronizasyonu değil) |
| Sepet / adres / fiyat / %19 KDV / 4,99 € DHL | Uygulama ve otomatik testler; normal müşteri Klarna siparişi | PASS, tekrar regresyon testleri sürüyor |
| PayPal | Eski 1 € kontrollü canlı QA başarılı; müşteri kasasında seçenek mevcut | Normal müşteri prod E2E, refund, webhook tekrarları ayrıca doğrulanmalı |
| Klarna | Gerçek müşteri RH-5, 829,99 €; Order Management CAPTURED ve tek gerçek capture; local payment_confirmed/shipped | PASS — tekrar tahsilat yapılmadı |
| Sipariş / PDF fatura | RH-5, `RH-2026-0000005` | PASS |
| Müşteri ve mağaza e-postaları | RH-5 received, paid, shipped ve mağaza kopyaları = sent; SMTP kabul | PASS (inbox teslimi ayrı kontrol edilebilir) |
| DHL | RH-5 `manual_shipped`, gerçek takip numarası kayıtlı | Manuel fulfillment PASS; DHL API otomatik etiket hâlâ eksik |
| KI saç denemesi | Canlı API; gerçek sunucu üretimi WebP HTTP 200; uygun olmayan foto 422 | PASS; kullanıcı bütçesi/rate-limit koruması ayrıca denetleniyor |
| Online cayma | `/widerruf/` iki aşamalı kayıt, geçersiz veri ret ve SMTP kuyruğu | Kod ve API testi var; gerçek kullanıcı E2E testi eksik |
| İptal/iade/refund/hatalı ödeme/webhook tekrarları | Otomasyon ve idempotency kodu mevcut | Gerçek müşteri üretim kanıtı eksik |
| Hukuki bilgi | AGB, Impressum, Datenschutz, Widerruf var | Satıcı adresi, veri işleme ve nihai hukuk onayı açık |

**Açık işler:** DHL canlı Developer API yetkileri ve otomatik etiket; müşteri-iade/refund/tekrarlı webhook E2E; nihai hukuki onay; sunucu güvenlik gözlemi; ön uç performans/CSS bölme. Gerçekten tamamlanmamış kontrolleri "PASS" sayma.

## 18 Kasım ikinci bağımsız denetim düzeltme paketi (DHL kapsam dışı)

- **PayPal tekrar webhook / return:** Kargoya verilmiş, teslim edilmiş veya iade edilmiş bir siparişte aynı `PAYMENT.CAPTURE.COMPLETED` olayı tekrar gelirse, yalnızca kaydedilmiş gerçek capture ve faturayı doğrulayıp sonucu idempotent döndüren koruma eklendi. Testler gerçek paraya dokunmadan mock/replay senaryolarıyla yapıldı. `PAYMENT.CAPTURE.REFUNDED` olayı otomatik tam/yarım refund statüsüne dönüştürülmüyor; durum sağlayıcı üzerinden incelenmeli.
- **PayPal/Klarna iade araştırması:** `/admin/erstattungen` admin-only salt-okunur ekranı eklendi. PayPal GET captured payment ve Klarna GET order'dan tutar/durum doğrulama; herhangi bir POST refund/capture, yerel stok/ödenmiş sipariş değişikliği yapılmıyor. Gerçek iade ancak belirli vaka, tutar, ürün dönüşü, vergi ve merchant onayıyla gerçekleştirilip belgelenebilir.
- **CSP:** `object-src 'none'; base-uri 'self'; frame-ancestors 'none'; upgrade-insecure-requests` artık ENFORCE; ödeme/analitik/script/style içerikli diğer CSP direktifleri uyumluluk gözleminde (`Report-Only`), güvenli tam enforcement henüz tek başına ilan edilmiyor.
- **Tasarım/performans:** Hero sonrası önce ürün koleksiyonu, sonra influencer hikayeleri geliyor. Ana sayfa ve iç sayfalar ortak `storefrontNav` / footer link veri kaynağı kullanıyor; ana sayfanın editoryal başlık/görsel düzeni korunuyor. Admin, KI, influencer/Instagram/home görsel CSS'i ayrı route segmentlerine ayrıldı; checkout ve stok DB canlı doğrulamaları cache'e alınmadı.
- **Dosya düzeni:** `.next-stale*`, eski kök `index.html`, `app.js`, `styles.css`, `assets/`, `3kare/` dosyaları silinmeden özel izinli `~/.config/desnod/rubyhair/legacy-root-archive-20261118/` klasörüne taşındı; mevcut Next.js `public/` ve git tarafından izlenen kaynaklar korunuyor.
- **Hukuki statü:** `MERCHANT-APPROVAL.md` güncel canlı satış ve geçmiş önizleme tutarsızlıklarını ayırır. Müşterinin önceki sözlü hukuk metni onayı not edildi; bağımsız/kalifiye nihai kontrol henüz doğrulanmadı. Klara Strasse 19 ve Zweigertstrasse 8 adresleri arasında resmi adres/iade adresi çelişkisi çözülmeden hukuken onaylı denilemez. İçerikler kaynak dışı resmi verilerle değiştirilmedi.
- **Uçtan uca kısıtlar:** Gerçek müşteri refund ve PayPal webhook replay'inin üretim üzerinde gerçek PSP imzalı olaylarla doğrulanması hâlâ açık. Testler mock seviyesinde; canlı ödeme/iade yapılmadı. Toplu CSP script/style enforcement ve gerçek mobil ekran taraması ayrıca gözlemlenmeli.

## Bağımsız denetim iyileştirmeleri

- 18.11: Next.js 16.4.3 -> 16.4.6 guvenlik yukseltmesi ve temiz `npm ci` tamamlandi; uretim `npm audit --omit=dev` sonucu 0 acik. Yerel Node 65/65 + TS 74/74 = **139/139**, TypeScript ve Next production build PASS. SWC bozuk kurulum iki klasoru sifreli olmayan yerel korumali yedege alinarak temiz kuruldu.
- 18.11: Google Fonts istemci CDN çağrıları kaldırılıp Playfair Display/DM Sans self-host bağımlılıkları eklendi; CSP report-only ve Permissions-Policy eklendi.
- 18.11: KI gorsel istegi maliyeti icin HMAC anonim IP ve PostgreSQL uzerinde atomik global/dakikalik/gunluk/eszamanli kota kontrolu eklendi (IP: 2/dak, 5/gun; global: 4/dak, 35/gun; paralel: 2). `20261118210000_tryon_quota` production DB migration PASS. MUSTERI fotograflari veritabanina kaydedilmez. Kota asiminda 429, DB erisim kaybinda ucretli provider istegi yapmadan 503.
- 18.11: Checkout, sepet, ürün ve hukuki sayfalarda sabit KI CTA gizlendi; canlı satışa uymayan eski ürün/admin metinleri güncellendi.
- 18.11: Eski NO-GO rapor metni aşağıda **yayın öncesi tarihsel kayıt** olarak korunuyor; güncel karar yerine geçmez.

---

## ARŞİV — 18 Kasım 2026, canlı satış açılmadan önceki denetim anlık görüntüsü

> **Uyarı:** Aşağıdaki "NO-GO", 503, stok NULL, e-posta kapalı gibi ifadeler yayından önceki testleri anlatır; 18 Kasım güncel durumunu temsil etmez.

# Ruby Hair — Canlı Yayın Öncesi Akış Kontrolü (18 Kasım 2026)

**Karar:** NO-GO — genel satış kapalı, müşteri düzeltmeleri ve gerçek ödeme mutabakatı bekleniyor.
**Kapsam:** Ruby Hair Next.js/Vercel vitrini, katalog, sepet, checkout, PayPal/Klarna, sipariş, fatura, e-posta ve kargo.
**Kural:** Gerçek müşteri checkout'u ancak tüm ödeme/sipariş/stoğa ilişkin kontroller, müşteri onayı ve düşük tutarlı gerçek satın alma testi başarılıysa açılır. DNS, e-posta MX ve Coming Soon korunur.

## Müşteri düzeltmeleri
- [x] 18.11 — Community hikayelerinde ikinci Asena tekrarı kaldırıldı. Tek Asena ardından Kristina geliyor (Elaine Victoria → Jessica Haller → Asena Neuhoff → Kristina). Diğer hikayeler bırakıldı. Bu istek otomatik regresyon testine işlendi.
- [ ] Müşterinin göndereceği sonraki ekran/adım düzeltmeleri; her biri ekran+işlev testiyle doğrulanacak.

## Fonksiyonel kontrol listesi
| Akış | Mevcut durum / doğrulama | Yayın öncesi kapanış ölçütü |
| --- | --- | --- |
| Masaüstü/mobil ana sayfa, menü, hikayeler | Next.js derleme ve statik testler mevcut; hikaye tekrarı kod düzeyinde düzeltildi | Gerçek mobil ve masaüstü ekran incelemesi, tüm butonlar, taşma ve hikaye aç/kapat/geçiş |
| Ürünler ve renk/uzunluk varyantları | Veritabanı 2 ürün / 38 varyant; katalog ve fiyat API sorguları yanıt veriyor | Fiyat, görsel, renk, 45-50 ve 55-60 cm, ürün seçimi ve stok müşteri onayı |
| Fiziki stok | 38 varyantın stok bilgisi önceki üretim kontrolde doğrulanmamış (NULL) | Her varyant için gerçek adet / stok sınırı / tükenmiş ürün denemesi |
| Sepet/kupon/kargo | Sunucu fiyat kontrolü mevcut; stok belirsiz ürün satın alınamıyor | Ürün ekleme/çıkarma/adet, para tutarı, nakliye ve gerekiyorsa kupon/indirim kapsamı |
| Normal müşteri checkout | `/api/checkout` kasıtlı olarak HTTP 503; `/kasse` sadece adres ve ödeme ön izlemesi | Adres, iletişim, Almanya vergi/kargo kuralları, gerçek sipariş/ödeme aşaması, müşteri sipariş numarası |
| PayPal | Sadece admin 1€ test; sağlayıcı onayı alındı, sipariş #2 `APPROVED` ama kesin capture kaydı yok | Normal müşteri checkout'u, tutar/para birimi eşlemesi, imzalı webhook, tek tahsilat, hata/iptal/iade |
| Klarna | Sadece admin 1€ Hosted Payment Page akışı kodlandı; kart işlemi E2E doğrulanmadı | Kart/pay-now merchant yetkisi, Almanya kart E2E, webhook/capture/tutar/idempotency/geri dönüş |
| Sipariş ve fatura | Gizli QA PDF faturası kodlandı; genel müşteri fatura akışı devre dışı | Siparişin tek kaydı, ödeme mutabakatı, yasal şirket bilgileri, benzersiz PDF, indirme |
| E-posta | Genel otomatik müşteri sipariş/ödeme e-postaları ve SMTP doğrulaması tamamlanmamış | Gerçek alıcıya sipariş, ödeme, kargo ve şifre bildirimleri; yanlış tekrarları engelle |
| DHL/kargo | Ayarlar kısmen çıkarılmış; gerçek etiket ve takip E2E tamamlanmamış | Ücret/teslim bölgesi, etiket, takip numarası, kargo bildirimi, teslim akışı |
| İptal/iade ve hukuki metinler | Mevcut GDPR/AGB/Widerruf taslaklarının müşteri onayı gerekiyor | Satıcı ve adres, KDV, iade, teslim süreleri, cayma fonksiyonu, telefon/mobil |
| Güvenlik/SEO | Coming Soon/anon checkout kilidi ve admin girişi mevcut | İçeriği yayından önce tam test, gizli API, rate-limit, ödeme erişim yetkileri, indeksleme/migrasyon |
| Gerçek müşteri uçtan uca test | Henüz yapılmadı | Kullanıcı ile 1€ kontrollü gerçek ürün siparişi: sepet → adres → PayPal/Klarna → capture → sipariş → PDF → e-posta → DHL, ardından tekrar işlem koruması |

## Otomatik test ve doğrulama
- 18.11.2026: tüm TS testleri, mevcut Node testleri, TypeScript ve production build PASS.
- Sunucu canlı API salt-okunur taramasında katalog, fiyat, sepet teklifleri ve geçersiz adet reddi PASS; bazı isteklerde zaman aşımı olduğundan tam akış smoke PASS değil. Kesin sebep belirlenmeden başarı iddiası yok.
- `scripts/go-live-preflight.cjs` NO_GO; özellikle normal checkout kilidi, fiziki stok, canlı PSP mutabakatı, mail/kargo ve legacy yedek geri yükleme kanıtı.
- Kullanıcı Türk kartıyla Klarna canlı testini tamamlayamadığını bildirdi; bunun satıcı hesap ayarı mı kart/bölge uygunluğu mu olduğu henüz doğrulanmadı.
- Admin QA ödemesi ile normal müşteri alışverişi **farklı akışlardır**. Yönetici QA başarılı olsa da normal checkout otomatik açılmaz.

## Sonraki güvenli uygulama sırası
1. Müşterinin ekran görüntülü arayüz ve içerik düzeltmeleri, her adımda tasarım + regresyon testi.
2. Stok/fiyat/kargo/şirket bilgilerini müşteriyle kesinleştir; genel checkout'u release gate arkasında geliştir.
3. PayPal ve Klarna müşteri checkout'u + güvenli sağlayıcı onayı, imzalı webhook, tekil tahsilat ve iptal/iade.
4. Fatura PDF, sipariş e-postası ve DHL senaryolarını staging ortamında uçtan uca doğrula.
5. Müşteri onayından sonra kontrollü gerçek müşteri siparişi; ardından Coming Soon kaldırma için ayrıca GO kararı.

## 18 Kasım Tape-in arşiv geri kazanım ek notu
- Eski WooCommerce SQL yedeği doğrulandı; yeni katalogda eksik olan 9 Tape-in renk/uzunluk kombinasyonu birebir orijinal varyant ID/SKU/fiyat/görselle eşleştirildi.
- 9 kayıt yalnızca **yerel** `src/data/products.json` kataloğuna eklendi, stok 0 / satış kapalı. Yerel toplam: Tape-in 36 varyant ve 18 renk.
- Canlı PostgreSQL **değişmedi** (27 Tape-in), toplu yayında `scripts/restore-legacy-tapein-variants.cjs` korumalı veri eklemesi gerekecek.
- Normal müşteri checkout hâlâ NO-GO; tüm gerçek stok/ödeme/kargo/fatura kontrolleri ayrı.

## 18 November 2026 – last client visual correction and release gate recheck

### Keratin Bondings source image, verified
- The customer flagged the Keratin card image as soft/blurry. Original published WooCommerce attachment `2022/09/1006-scaled.jpg` was recovered by read-only request to the **old Ruby Hair IONOS HTTPS origin** with the original domain host; the current Vercel site was not changed.
- Authentic original image: **1707 x 2560 px** (255,270-byte JPEG), compared to earlier 1024 x 1536 px derivative. Saved a true-image WebP without generative changes to `public/assets/ruby-hair-keratin-original-20261118.webp`, **175,976 bytes**. Changed only the Keratin homepage category-card image source and supplied intrinsic dimensions.
- Desktop local Chrome visual preview at `/#collections` showed the three category cards and the sharper original Keratin photograph. Asset local HTTP 200 and there were no browser console errors. Separate regression test added. The previously added KI floating CTA was reduced in width to avoid covering the Keratin category heading.

### Rechecked automated tests
- TypeScript check PASS, Node **57/57**, TS **41/41**, total **98/98**, production Next.js build PASS (20/20 static pages). Note: SWC native module warning on Mac falls back to working WASM and is not a build failure.
- Local standard routes `/`, both Tape-in category lengths, Keratin category, one variant detail, `/warenkorb`, `/kasse`, `/kontakt`, `/versand-zahlung`, `/haar-anprobe` returned HTTP 200 on the running preview (10/10). Correct legal page routes are under `/rechtliches/{impressum,datenschutz,agb,widerruf}`, not the legacy top-level aliases. Their content currently describes the site as a preview and still requires legal finalization.
- On live domain: homepage HTTP **503** branded Coming Soon, `POST /api/checkout` HTTP **503**; protected admin QA and Klarna callback HTTP 200/redirect behavior remains isolated. No public store checkout enabled and no payment or stock mutation performed.

### Live-production read-only inventory/payment checks
- Current production DB: **2 active products**, **38 active variants with NULL/unverified stock**, **0 active variants with verified positive stock**, **0 customer orders**, **0 invoices**; **0/9** archived Tape-in records imported into live database. Two separate hidden QA variants are inactive/stock-zero. Nine recovered Tape-in items exist **only in local code** awaiting batched migration.
- AES-encrypted live payment settings have six field names for PayPal/Klarna, but existence of keys is **not** end-to-end customer payment acceptance. No verified ordinary customer PayPal/Klarna capture+webhook+refund flow. SMTP (IONOS) and DHL API integration credentials are not in the protected payment settings and full end-to-end mail/label tracking flows remain unverified.
- `npm run preflight:live`: **NO_GO, 7 blockers** including intentionally unsynced local branch, uncommitted correction (to be resolved by the next local commit), disabled normal checkout, local build environment not injected with the production DB/vault env, unverified complete WordPress file restore drill, and unsigned customer payment/shipping E2E. DNS MX record check PASSED. Some preflight failures describe missing local environment variables, not evidence that live DB does not exist; live DB was independently queried read-only.
- The current Impressum and privacy legacy source differ on the legal street address (Klara Strasse 19 vs Zweigertstrasse 8). Merchant approval and final privacy/AGB/Widerruf documents are prerequisites for selling. KI try-on vendor integration and GDPR E2E must also be signed off before advertising it as fully operational.

**Decision: NO-GO for removing Coming Soon or enabling live sales.** Keep protected admin QA accessible, live public site closed and previous merchant records intact. Required path to GO: confirm actual stock and legal details; complete customer checkout with safe PayPal/Klarna authorization, exactly-once capture, signed webhooks, cancellation/refund; invoice+SMTP transactional emails; DHL labels/tracking; real low-value authorized customer purchase and refund, then review and perform a single staged batch release with rollback. No live code push and no external financial actions in this review.

## 18 Nov 2026 — merchant-directed public catalog launch (staged sales tests)
- Owner requested public opening now, with the following inventory rule: **explicit 0 = out of stock**, **blank/NULL = available**. Existing PostgreSQL catalog already treated NULL as selectable; the server cart quotation and product badge were aligned: NULL now reports `available` / `Verfügbar`, 0 or inactive is not available. Admin inventory form explains blank vs zero.
- Public-facing website is enabled on Vercel's **production** deployment only (`VERCEL_ENV=production`); branch previews remain noindex/holding by default. Domain-specific proxy continues verified JWT admin protection, protects all `/api/admin/` and private `/qa/` routes, and allows public only the existing catalog, cart-quote, analytics, Instagram thumbnail, and opt-in AI try-on handlers. Public normal checkout endpoint remains 503 until post-launch customer payment, invoicing, email, and DHL tests pass. Public pages and browsing are therefore live, but accepting completed consumer orders is NOT yet enabled.
- Owner confirms legal texts approved, DHL to be tested after storefront opening, and PayPal/Klarna full customer payments plus order invoice emails to be tested after storefront opening. This is treated as approval to open the **public storefront only**, not evidence of completed PSP/capture/transactional-email/label/refund E2E checks.
- Verified safe SQL backup of original 27 Tape-in variants at local protected backup path, and verified guarded archival restore against production PostgreSQL using both direct and pooled connections. Final production Tape-in now **36 variants** including 9 historical WooCommerce variants `active=false`, `stockQuantity=0`. Existing 27 remain unchanged. No customer financial transaction in this step.
- Local build tests: TypeScript PASS, Node 58/58 and TS 41/41 PASS; production Next.js build PASS. Local production-mode proxy smoke for `rubyhair.de` Host: `/` 200, `/api/catalog` 200, cart quote POST 200, `/api/admin/qa-invoice` unauthorized 503, `/admin` redirects 307, `/kasse` 200, `/rechtliches/impressum` 200; `/api/checkout` POST 503 as designed.
- Next immediate test after production deployment: public domain routes, admin login protection, 18 color options each length, NULL-vs-0 cart quotation, SEO, images, and redirect safety. Then implement/verify full customer order/capture/webhook, transactional invoice + SMTP, DHL, refunds, and a real one-Euro order with seller approval before accepting unrestricted sales.
