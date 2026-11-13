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
- Iki asama: once gpt-4.1-mini ile Responses API uzerinden foto uygunluk testi (store:false), sadece 'suitable' ve confidence >= 0.85 ise gpt-image-2.5-sunburst /v1/images/edits ile sac ekleme. Bu iki modele de API projesinde erisim olmali.
- One/yan/arkadan tek kisilik gercek fotograflar kabul edilebilir. Birden cok kisi, manzara/urun/hayvan, saci gorunmeyen, kadraj disinda kafa, cok uzak veya bulanik foto reddedilir.
- Vision siniflandirma servisi hatali/erisilemez ise image edit denemesi BASLAMAZ. Basarisiz uygunluk denetiminde sadece foto kontrolu API maliyeti dogabilir, gorsel olusturma calismaz.
- Foto akisi sunucuda baslangictan sona uygulanan bu kontrolu sadece istemci tarafinda saklamaz. Test kodu veya 3 kez siniri yok.
- Tam gercek kullanici kalitesi anahtar tanimlandiktan sonra farkli pozlardaki orneklerle test edilmelidir; AI uygunluk analizi yanilabilir.
- API public demo uzerinden cagrilabilir. Key eklendikten sonra her izinli uretim API maliyetine neden olabilir; kullanimi OpenAI projesinin Billing/Usage panelinden izle.
- Fotograf Ruby Hair veritabaninda kalici olarak saklanmiyor, provider islemesi ve site gizlilik metni ayri.
- Gercek siparis/odeme canliya alinmaz. rubyhair.de eski WP DNS degismez.
