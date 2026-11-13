# Ruby Hair - 14.11.2026 odeme entegrasyonu gorusmesi

## Kaynak ve kesinlik
- 13.11.2026 public WooCommerce Store API /wp-json/wc/store/v1/cart (GET, salt okunur) icindeki `payment_methods`:
  `woocommerce_payments`, `woocommerce_payments_klarna`, `bacs`,
  `klarna_payments`, `ppcp-trustly`, `ppcp-gateway`, `ppcp-credit-card-gateway`.
- Bu liste gateway ID varligini kanitlar; aktif tahsilat, gercek para akisi, plugin API anahtarinin yeniden kullanimi kaniti DEGIL.
- Eski site anasayfasi PayPal, Kreditkarte, Klarna, SEPA soyluyor. AGB direkt banka havalesi, PayPal, Visa, Mastercard soyluyor. Bunlar arasindaki farklar musteri tarafindan onaylanacak.

## Yarin musterinin ekranindan teyit edilecekler
1. WooCommerce > Zahlungen: kullanilabilir/aktif gateway, checkout'ta gorunen ad, siralama, hangi hesap ve para birimi.
2. WooPayments: account owner, payout/banka durumu, Almanya/EUR, mevcut eklenti baglantisi. **WooPayments tokeni otomatik olarak bagimsiz Next.js Stripe API key olarak kabul ETME.** Gerekiyorsa bagimsiz PSP/Stripe merchant erisimi olustur.
3. PayPal Developer: onayli Business hesap, REST Client ID ve Secret (test+canli), webhook olusturma yetkisi, refund yetkisi. Secret'lar sadece host secret manager ortaminda tutulacak, repo/WhatsApp/chat ekranina yapistirilmayacak.
4. Klarna: `woocommerce_payments_klarna` ve `klarna_payments` arasindan tek kanonik entegrasyon yolu secilecek. Dogrudan Klarna Merchant API mi, PSP uzerinden mi? Canli/sandbox yetkileri teyit edilecek.
5. PayPal Trustly: ilgili PayPal Business hesabinda etkin mi, bagimsiz storefront API ile kullanilabilir mi test edilecek. Yoksa destekleniyor izlenimi verilmez.
6. SEPA: eski sayfadaki "SEPA" Lastschrift mi, SEPA bank transfer mi? WooCommerce public gateway listesi `bacs` gosteriyor; dogrulama olmadan SEPA Direct Debit diye etiketleme.
7. Banka havalesi: alici ad/IBAN/BIC ve EUR odeme talimati onaylansin. Havale siparisi "pending" olusacak; manuel mutabakat olmadan "paid" sayilmayacak.
8. DHL kargo, Almanya adresleri, 4,99 EUR eski bedel, iadeler / Widerruf, siparis e-postalari ve vergi/hukuk metinleri musteriden teyit.

## Yazilimda tamamlanacak (hesap bilgileri sonrasinda)
- Korumali checkout session/order reservation ve EUR miktar dogrulamasi.
- Provider adapter'lari: PayPal, secilen kart/PSP, secilen Klarna, banka havalesi; Trustly ancak gercek destek kanitlanirsa.
- Imzali webhook dogrulamasi ve idempotency: tekrarlanan callback iki satis/iki stok dususu yapmaz.
- Basarili/basarisiz/iptal/timeout/geri odeme testleri, admin siparis durumu ve fatura/e-posta.
- Test odemesi + canli kucuk test + vergi/kargo hukuk onayi. Bu asamalardan once checkout 503 kalir.
- Yeni admin demo icin ayri PostgreSQL, bcrypt admin password hash, session secret, migasyon/seed, erisim testi. Eski rubyhair.de DNS/WordPress degismez.

## 13.11.2026 kod hazirligi
- Elmas Triko benzeri toplu fiyat/stok/varyant editoru, anonim toplulaştırılmış analytics grafikleri ve ödeme geçidi hazırlık ekrani hazırlandı.
- Backendde gercek provider tahsilati YOK. Eski WooCommerce admin secretlari kopyalanmadi.
- AI deneme test erisim kodu ve riza zorunlu; 20 dakikadaki 3 deneme siniri kaldirildi. Gerçek kullanıcı fotoğrafı ile KI sonucu kalite testi henüz PASS değil.
