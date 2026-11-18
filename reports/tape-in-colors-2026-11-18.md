# Ruby Hair – Tape-in renk eşleştirme (18 Kasım 2026)

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
