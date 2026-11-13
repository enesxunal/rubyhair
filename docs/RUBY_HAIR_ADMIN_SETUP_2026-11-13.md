# Ruby Hair Vercel demo admin kurulumu - 13 Kasim 2026

## Tamamlananlar
- Ruby Hair icin bagimsiz, ucretsiz Prisma Postgres resource `rubyhair-admin-demo-2026` Vercel project `rubyhair` icin **yalniz production environment** baglandi.
- 6 migration remote veritabaninda uygulandi; 2 urun ve 38 varyant seed edildi. Stok NULL (bilinmiyor). `rubyhair.de` eski WordPress degismedi.
- Ruby Hair `/admin/zahlungen` ekranina PayPal, Kart/PSP, Klarna, Trustly ve Vorkasse alanlari eklendi. Ayrik sandbox/live, her alanda doldurulmus/doldurulmamis bilgisi, bos alan mevcut kaydi korur, silme ayri onay gerektirir.
- Veriler AES-256-GCM ile, sunucuya ozel 256-bit `RUBY_PAYMENT_SETTINGS_KEY` kullanilarak PostgreSQL'de sifreli tutulur. Gizli alanlar browser'a geri gonderilmez.
- PayPal/Klarna/PSP webhook veya tahsilat adapterleri henüz baglanmadi. Checkout 503 ile kapali kalir.

## Yönetici girişi için 1 kez yapılacak
Vercel Dashboard > rubyhair > Settings > Environment Variables > Production icin:
1. `ADMIN_EMAIL`: kullanacagin yonetici e-posta adresi (diger projelerden admin kopyalama yok)
2. `ADMIN_PASSWORD_HASH`: en az 14 karakterli guclu sifre icin Mac terminalde `node scripts/hash-admin-password.cjs` kullan; sifreyi stdin uzerinden ver, Vercel'e bcrypt hash sonucunu kaydet. Duzyazi sifre yazma.
3. `SESSION_SECRET`: Mac terminalinde `openssl rand -base64 48` ile guclu benzersiz rastgele deger uret.
4. `RUBY_PAYMENT_SETTINGS_KEY`: Mac terminalinde `node -e 'console.log(require("crypto").randomBytes(32).toString("base64url"))'` ile 256-bit yeni anahtar uret. Tek kopyasini guvenli sifre kasasinda sakla; bu anahtar kaybolursa mevcut entegrasyon kayitlari cozulemez.

**Secrets** Vercel dashboard uzerinden kaydedilmeli. Kisiye ozel parola, API secret veya KEY degerini sohbet veya GitHub'a yapistirma.

Ardindan rubyhair Vercel Production'i Redeploy et; sadece Vercel demo alan adi. `/admin/login` e-posta ve sifreyle gir; `/admin/produkte` toplu varyant kaydi, `/admin/analytics` toplu istatistikler ve `/admin/zahlungen` erisimi test et. Veritabaninda `DATABASE_URL` ve `DATABASE_URL_POOLED` baglanti degerleri mevcut; bu alanlari elle degistirme.

## Odemelerin aktive edilmesi icin ayrica
Musteri PayPal/Klarna/kart PSP bilgilerini admin formlarindan girdikten sonra backend provider adapterlari, webhook imza kontrolleri, idempotency, sandbox, refund/cancel ve canli kucuk tutar testleri gerekiyor. Kod girmek tek basina odeme entegrasyonunu calistirmaz.

## Guvenlik / durum
- Admin ayarlari Vercel'e henüz girilmediyse giriş formu acilmaz; `adminConfigured` false.
- Sifreleme anahtari girilmediyse ödeme kodu kaydetme formu disabled olur.
- Demo noindex ve gerçek checkout kapali kalmali.
