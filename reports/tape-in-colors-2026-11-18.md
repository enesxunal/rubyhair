# Ruby Hair – Tape-in renk eşleştirme (18 Kasım 2026)

## Güncel sonuç – orijinal WooCommerce SQL doğrulandı (18.11.2026)

**Tüm 9 eksik Tape-in varyantı bulundu ve yerel ürün kataloğuna eklendi.** Eski SQL yedeğindeki gerçek SKU, renk, uzunluk, fiyat ve attachment ID'leri karşılaştırıldı. Orijinal WooCommerce fiyatları yeni siteye 17 Kasım'da uygulanmış **+5 €** fiyat politikasıyla eşlendi. Tüm görseller yerel `/media` arşivinde mevcut. **Stok 0 ve `available=false`, `purchasable=false`**; hiçbir eksik varyant satılamaz.

| WooCommerce ID | Renk | Uzunluk | Eski fiyat | Yeni katalog fiyatı | Stok |
| --- | --- | --- | ---: | ---: | ---: |
| 884 | 1b | 45–50 cm | 135 € | 140 € | 0 |
| 885 | 2b | 45–50 cm | 135 € | 140 € | 0 |
| 891 | 9A | 45–50 cm | 135 € | 140 € | 0 |
| 896 | SILVER | 45–50 cm | 135 € | 140 € | 0 |
| 897 | 1 | 55–60 cm | 160 € | 165 € | 0 |
| 898 | 1b | 55–60 cm | 160 € | 165 € | 0 |
| 1319 | EVE | 55–60 cm | 160 € | 165 € | 0 |
| 1321 | RUBY | 45–50 cm | 160 € | 165 € | 0 |
| 1701 | 2 | 45–50 cm | 135 € | 140 € | 0 |

**Yerel sonuç:** Tape-in **36 varyant, 18 renk, her uzunlukta 18 kayıt**; 45–50 cm 12 siparişe aday + 6 stokta yok; 55–60 cm 15 siparişe aday + 3 stokta yok. Keratin 11 kayıt değişmedi. `src/data/products.json` ve `scripts/legacy-tapein-restoration-20261118.json` yerelde hazır; gerçek SKU ve görsel kimlikleri manifestte saklandı.

**Yayın geciktirildi:** Canlı PostgreSQL halen 27 Tape-in kayıt içeriyor. `scripts/restore-legacy-tapein-variants.cjs` varsayılan olarak sadece doğrulama yapıyor ve hiçbir şeyi değiştirmiyor. Toplu yayın aşamasında ayrı, açık onayla (`--apply` + koruyucu doğrulama) yalnızca 9 kaydı `stockQuantity=0, active=false` olarak ekleyecek. Eski/yeni mevcut 27 ürün değiştirilmeyecek. PayPal, Klarna, Coming Soon ve normal checkout olduğu gibi kapalı kalacak.

**Testler:** TypeScript, 56 Node + 41 TS test PASS, üretim derlemesi PASS, canlı veritabanına read-only ön kontrol PASS (27 → 36). Ayrı yerel 45/60 cm tarayıcı kontrolünde 12+6 ve 15+3 kart, konsol hatası yok; 1b sayfasındaki sepete ekle butonu devre dışı. Satışa geçmeden gerçek stok teyidi hala gerekli.

---

## İlk katalog incelemesi (yedek incelenmeden önceki durum)

Kaynaklar: Müşterinin gönderdiği 18 renk listesi; `src/data/products.json`; üretim PostgreSQL üzerinden salt-okunur envanter doğrulaması.

**Mevcut ürün gerçeği:** Tape-in 27 varyant / 17 farklı renk. Keratin Bondings ürününde 1b var ancak Tape-in 1b varyantı yok. Müşteri listesi 18 renk; bunların tamamını listelemeye ekledik ancak kaydı olmayan uzunluk-renk kombinasyonlarını satılabilir yapmadık.

| Renk | 45–50 cm | 55–60 cm |
| --- | --- | --- |
| 1 | Kayıtlı | **Eksik** |
| 1b | **Eksik** | **Eksik** |
| 2 | **Eksik** | Kayıtlı |
| 2b | **Eksik** | Kayıtlı |
| 4 | Kayıtlı | Kayıtlı |
| 6 | Kayıtlı | Kayıtlı |
| 7 | Kayıtlı | Kayıtlı |
| 8 | Kayıtlı | Kayıtlı |
| 9A | **Eksik** | Kayıtlı |
| 10 | Kayıtlı | Kayıtlı |
| 60 | Kayıtlı | Kayıtlı |
| ARI | Kayıtlı | Kayıtlı |
| EVE | Kayıtlı | **Eksik** |
| Banu | Kayıtlı | Kayıtlı |
| BRONDE | Kayıtlı | Kayıtlı |
| LOUI | Kayıtlı | Kayıtlı |
| RUBY | **Eksik** | Kayıtlı |
| SILVER | **Eksik** | Kayıtlı |

Toplam: 45–50 cm için 12 mevcut / 6 eksik; 55–60 cm için 15 mevcut / 3 eksik. 9 eksik kombinasyon için satışa hazır ürün, fiyat ve stok bilgisi doğrulanmadı.

**Uygulama:** Her iki kategori sayfasında da 18 renk görüntüleniyor. Mevcut uzunlukta ürün olmayan kartlar "NICHT BESTELLBAR / Nur auf Anfrage" gösteriyor ve iletişim sayfasına gidiyor; yanlış uzunluk ürününe ya da sepete yönlendirme yapılmıyor. 1b için yalnızca Keratin katalog görseli referans olarak kullanılıyor; Tape-in ürünü olduğu iddia edilmiyor.

**Açık onaylar:** Eksik dokuz kombinasyon gerçekten sunulacak mı? Her biri için fiyat, fiziksel stok, doğru ürün görseli ve (varsa) WooCommerce/SKU referansı gerekiyor. Ayrıca Tape-in EVE ve Keratin 1006 aynı resim dosyasını kullanıyor; müşteri doğrulaması olmadan etiket değiştirilmemeli.

**Yayın kuralı:** Renk görünürlük düzeltmesi yerelde tutulacak. GitHub/Vercel canlı yayını ve gerçek müşteri checkout'u, tüm diğer müşteri revizyonları ve uçtan uca satış testleri sonrası yapılacak.

## Legacy WooCommerce audit – 18 November 2026

The locally preserved 17 November 2026 WooCommerce variation inventory lists **36 Tape-in records**, compared with **27 imported into the new store**. These nine old variation IDs were omitted: `884`, `885`, `891`, `896`, `897`, `898`, `1319`, `1321`, `1701`. Each missing old record has `stock=0` and `outofstock` in the legacy inventory. This is evidence that old product records existed, not that they are currently sellable. Some other historical out-of-stock records also remain imported, so the exact import filter is not yet established.

**Resolved by original WooCommerce SQL:** All nine missing IDs were checked against their `attribute_pa_produktfarbe`, `attribute_pa_produktlaenge`, `_sku`, `_price`, `_thumbnail_id`, `_stock` and `_stock_status` entries. All nine exactly match the nine originally missing color/length combinations. The old stock is zero in every case. This original finding is superseded by the restored local snapshot documented below.
