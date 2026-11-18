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
