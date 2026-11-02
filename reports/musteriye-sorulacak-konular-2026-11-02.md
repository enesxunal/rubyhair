# Ruby Hair — Müşteriye sorulacak konular (2 Kasım 2026)

**Durum:** Müşteriye henüz sorulmadı. Kullanıcı kararı: Eski rubyhair.de sitesinde yayımlanan koşulları yeni mağaza taslağına esas al; uyuşmazlıkları not al, şimdi soru gönderme. Satış ve ödeme hâlâ kapalı.

## Eski siteden esas alınanlar — tekrar sormaya gerek yok

- Satıcı: Ruby Hair / Nazmi Bulganlar, Klara Straße 19, 45130 Essen; info@rubyhair.de; KDV kimlik no DE356097157.
- Almanya DHL gönderim, sipariş başına 4,99 €, en fazla 5 iş günü.
- Ürün fiyatları eski AGB'ye göre KDV dahil; kapıda ödeme yok.
- Eski AGB ödeme seçenekleri: havale/ön ödeme, PayPal, VISA, Mastercard. Ön ödemede sevkiyat ödeme alındıktan sonra.
- 14 günlük yasal cayma hakkı; alıcı doğrudan iade kargo ücretini öder.
- Ürünler: Keratin Bondings 25 adet/paket, Tape-in 10 adet/paket, %100 gerçek saç.

## Müşteriyle sonra netleştirilecek maddeler

| Öncelik | Soru | Kaynaktaki uyuşmazlık / eksiklik | Geçici uygulama |
|---|---|---|---|
| Kritik | **İlk gönderim ücretini caymada iade ediyor muyuz?** | AGB, ilk teslimat ücretini iade kapsamından çıkarıyor; ayrı Widerrufsbelehrung, en ucuz standart gönderimi de iade ediyor. BGB §357(2) genelde standart gönderim iadesi öngörüyor. | Her iki eski kaydı kaynaklı özetle; bağlayıcı şart gibi gösterme. Nihai metin hukuki onay beklesin. |
| Kritik | **Doğru iade adresi ve telefon nedir?** | Ayrı Widerrufsbelehrung'da telefon için “!!!__ T E L N U M __!!!” ve dönüş alıcısı/adresi için taslak yer tutucu var. | İmpressum'daki Klara Straße 19 yalnızca satıcı/iletişim adresi olarak gösterilir; ayrı iade deposu uydurulmaz. |
| Kritik | **Datenschutz için resmî sorumlu adres hangisi?** | Impressum: Klara Straße 19, 45130 Essen. Datenschutz: Zweigertstraße 8, 45130 Essen. | İmpressum adresi kaynağıyla tutulur. Gizlilik metni yeni Next.js platformuna göre güncellenecek. |
| Yüksek | **Ödeme yöntemlerinin nihai listesi hangisi?** | AGB: havale, PayPal, VISA/Mastercard. Ana sayfa: PayPal, kredi kartı, Klarna, SEPA. Datenschutzerklärung daha fazla sağlayıcı da sayıyor. | AGB listesi esas alınan eski koşul; diğerleri kaynak farkı olarak notlu. 2. aşamada entegrasyon. |
| Yüksek | **Yalnız Almanya'ya mı gönderilecek?** | AGB 6.1 Almanya içi teslimatı söyler, 6.3 Almanya dışını koşullu olarak anar; ücret/süre yok. | Almanya içi DHL/4,99 €/5 iş günü göster; yurt dışı ücret/süre uydurma. |
| Yüksek | **Vergi ve ticaret sicil bilgileri tam mı?** | Eski AGB “Handelsregister: Amtsgericht Essen” yazıyor ama sicil numarası yok. KDV no belirtilmiş; yeni site fiyat/vergi gösterimi doğrulanmalı. | Verilen işletme ve KDV no taşındı; sicil numarası/vergisel rejim uydurulmaz. |
| Yüksek | **14 gün içinde paket/ürün durumuna göre iade politikası nedir?** | Ana sayfada ambalaj ve ürünün zarar görmemiş olması şartıyla 14 gün “Rückgaberecht” iddiası var; yasal cayma hakkıyla aynı şey olmayabilir. | 14 günlük yasal cayma korunur; genel hijyen istisnası veya ambalaj şartı icat edilmez. |
| Yüksek | **38 varyantın kesin stokları ve fotoğraf doğruluğu nedir?** | Kamuya açık eski mağazada adet bazlı stok yok; Tape-in EVE ve Keratin 1006 aynı görseli kullanıyor. | Mevcut görseller korunur, stok NULL (bilinmiyor), satış kapalı. |
| Kritik | **19 Haziran 2026'dan beri gerekli elektronik cayma işlemi nasıl onaylanacak?** | Eski site yalnız metin sunuyor. §356a BGB kapsamındaki online sözleşmeler için iki adımlı “Vertrag widerrufen” ve elektronik alındı onayı gerekir. | Çalışmayan sahte buton koyma; satışa açmadan önce işleyen süreç + e-posta/kanıt kaydı ve gizlilik metni hazırlanır. |
| Orta | **Eski AB ODR/OS bağlantısı kaldırılmasını onaylıyor musunuz?** | Eski Impressum ve AGB'de 20 Temmuz 2025'te kapanan platform bağlantısı var. | Çalışmayan yönlendirme yeni sisteme aktif link olarak eklenmez. |
| Orta | **Yeni sistemdeki gerçek veri işleyenleri kimler?** | Eski Datenschutz, WordPress, farklı cookie eklentileri ve ödeme sağlayıcıları için hazırlanmış. | Next.js/Vercel test ortamındaki gerçek işleyiş özetlenir; nihai sağlayıcılar sonra belirlenir. |

## Kaynaklar

- https://rubyhair.de/
- https://rubyhair.de/agb/
- https://rubyhair.de/widerrufsbelehrung/
- https://rubyhair.de/impressum/
- https://rubyhair.de/datenschutzerklaerung/
- https://www.gesetze-im-internet.de/bgb/__357.html
- https://www.gesetze-im-internet.de/bgb/__356a.html

**Takip kararı:** Müşteriye şimdi mesaj atma; soruları toplu olarak son onayda ilet. Ödeme, SMTP, kapsamlı E2E, admin ve WebAltyapı/domain taşıma sırası değişmedi.
