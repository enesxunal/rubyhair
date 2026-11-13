# Ruby Hair - KI Haaranprobe API kurulum notu

## Canli demo icin tek ayar
- Vercel > rubyhair > Settings > Environment Variables > Production
- RUBY_HAIR_OPENAI_API_KEY = Ruby Hair icin ayri OpenAI project API secret key (sk-...)
- Key yalniz server-side tanimlanir; browser'a, GitHub'a, chat'e veya urun tablosuna girilmez.
- Mevcut OPENAI_API_KEY ve RUBY_TRYON_TEST_CODE degistirilmedi, fakat yeni KI kodu bu ikisini kullanmaz.
- Degisken eklendikten sonra Production Redeploy yap.
- https://rubyhair.vercel.app/api/tryon/generate GET available:true / requiresConsent:true donmeli.
- https://rubyhair.vercel.app/haar-anprobe/ uzerinden kendi izinli bir fotografla bir gercek test yap. Test sonucu dogal sac rengi/sekli bozulursa bunu basarili diye sunma.
- Fotograf secimi/renk/uzunluk + acik foto isleme onayi olmadan API cagrisina izin verilmez.
- Eski ozel giris kodu istendi mi? Hayir. 20 dakikada uc uretim siniri? Hayir.
- Model: gpt-image-2.5-sunburst, /v1/images/edits. Ucretler ve model erisimi ilgili OpenAI API projesine aittir.
- API public demo uzerinden cagrilabilir. Key eklendikten sonra her izinli uretim API maliyetine neden olabilir; kullanimi OpenAI projesinin Billing/Usage panelinden izle.
- Fotograf Ruby Hair veritabaninda kalici olarak saklanmiyor, provider islemesi ve site gizlilik metni ayri.
- Gercek siparis/odeme canliya alinmaz. rubyhair.de eski WP DNS degismez.
