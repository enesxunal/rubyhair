# Ruby Hair — Lokal sentetik performans ve responsive QA

Tarih: 8 Kasım 2026. Lokal Mac Chromium (headless), Next.js production build. Ağ, sunucu ve gerçek ziyaretçi verisi değildir; **Core Web Vitals saha testi değildir**.

| Genişlik | Sayfa | Görünüm | FCP (ms) | DOMContentLoaded (ms) | Kaynak sayısı |
|---:|---|---|---:|---:|---:|
| 320 | / | PASS | — | — | 14 |
| 320 | /kollektionen/ | PASS | 48 | 11 | 45 |
| 320 | /kollektionen/tape-in-extensions/?laenge=45-50-cm | PASS | 48 | 17 | 47 |
| 320 | /produkt/tape-in-extensions/?farbe=6&laenge=45-50-cm | PASS | 40 | 14 | 44 |
| 320 | /kasse/ | PASS | 20 | 7 | 20 |
| 320 | /rechtliches/datenschutz/ | PASS | 32 | 9 | 20 |
| 390 | / | PASS | 36 | 10 | 39 |
| 390 | /kollektionen/ | PASS | 40 | 10 | 47 |
| 390 | /kollektionen/tape-in-extensions/?laenge=45-50-cm | PASS | 32 | 15 | 47 |
| 390 | /produkt/tape-in-extensions/?farbe=6&laenge=45-50-cm | PASS | 36 | 13 | 44 |
| 390 | /kasse/ | PASS | 36 | 7 | 20 |
| 390 | /rechtliches/datenschutz/ | PASS | 28 | 8 | 20 |
| 768 | / | PASS | 40 | 12 | 39 |
| 768 | /kollektionen/ | PASS | 36 | 9 | 40 |
| 768 | /kollektionen/tape-in-extensions/?laenge=45-50-cm | PASS | 28 | 15 | 49 |
| 768 | /produkt/tape-in-extensions/?farbe=6&laenge=45-50-cm | PASS | 44 | 17 | 42 |
| 768 | /kasse/ | PASS | 28 | 9 | 29 |
| 768 | /rechtliches/datenschutz/ | PASS | 32 | 7 | 20 |
| 1440 | / | PASS | 44 | 12 | 39 |
| 1440 | /kollektionen/ | PASS | 32 | 11 | 38 |
| 1440 | /kollektionen/tape-in-extensions/?laenge=45-50-cm | PASS | 40 | 13 | 60 |
| 1440 | /produkt/tape-in-extensions/?farbe=6&laenge=45-50-cm | PASS | 40 | 16 | 58 |
| 1440 | /kasse/ | PASS | 40 | 8 | 39 |
| 1440 | /rechtliches/datenschutz/ | PASS | 28 | 10 | 38 |

**Sonuç:** 24/24 sayfa-ekran kombinasyonu başarılı, 0 hata.

## Sonraki gerçek yayın doğrulaması
- Testler yerel ortamda yapıldı; rubhair.de domain transferi ve WebAltyapı barındırması sonrasında gerçek mobil cihaz, Lighthouse/PageSpeed, Search Console ve 28 günlük Core Web Vitals saha verileri ayrıca gereklidir.
- Vercel demo noindex/disallow iken SEO performansını arama sonuçlarından ölçmek doğru değildir.
- Ürün görselleri yeniden çekim/renk onayı bekliyor. Renk swatch görsellerine kalite kaybettirebilecek filtre uygulanmadı.
