# 📚 Güzin Ders — Kişisel Final Çalışma Platformu

Deniz için tasarlanmış, **derste işlenen notları çalışma kartlarına dönüştüren, not aldıran
ve performansa göre sınırsız quiz üreten** tek sayfalık (SPA) bir çalışma uygulaması.

Saf **Vanilla JS (ES modülleri) + HTML + CSS** ile yazıldı — derleme adımı (build step) yok,
framework yok, bağımlılık yok. Doğrudan **Netlify**'da (veya GitHub Pages'te) yayınlanabilir.

---

## ✨ Özellikler

- **Merkezî Pano** — Tüm dersler tek hub'da; ilerleme çubukları ve istatistikler.
- **Çalışma Modülü** — Ders notları Markdown olarak işlenir; her slayt/sayfa açılır-kapanır
  bir **çalışma kartına** bölünür. "Kartlar" ↔ "Tam metin" görünümü.
- **Entegre Defter** — Her konu için kendi notlarını yaz; `localStorage`'a **otomatik kaydedilir**.
- **Gelişmiş Quiz Motoru** — Dört format: çoktan seçmeli, doğru/yanlış, boşluk doldurma,
  klasik/açık uçlu.
- **🔁 Sınırsız (Dinamik) Quiz Üretimi** — Bir test bittiğinde uygulama **durmaz**:
  materyale ve **senin performansına** (en çok yanlış yaptığın konulara) göre LLM'den
  yepyeni bir test üretir ve doğrudan ona geçer. API anahtarı yoksa hazır soru bankası
  karıştırılarak pratik yine de hiç bitmez.
- **Tema** — Sıcak "kâğıt" açık tema + odaklanma için koyu tema.

---

## 🚀 Yerelde Çalıştırma

ES modülleri `file://` üzerinden çalışmaz; küçük bir yerel sunucu yeterli:

```bash
# Proje klasöründe:
python -m http.server 8000
# Tarayıcıda: http://localhost:8000
```

Alternatif: `npx serve` veya VS Code "Live Server" eklentisi.

---

## 🌐 Netlify'da Yayınlama

Build adımı olmadığı için ayar gerektirmez. `netlify.toml` zaten kutuda — `publish` kökü
`.` olarak ayarlı ve tüm yollar `index.html`'e düşer (SPA fallback). İki yol var:

**A) Sürükle-bırak (en hızlı)**
1. [app.netlify.com](https://app.netlify.com) → **Add new site → Deploy manually**.
2. Bu klasörü (içinde `index.html` olan kök) olduğu gibi sürükle-bırak.
3. Site saniyeler içinde `https://<rastgele-ad>.netlify.app` adresinde yayında. Ad'ı
   *Site settings → Change site name* ile değiştirebilirsin.

**B) Git'ten otomatik dağıtım (her push'ta güncellenir)**
```bash
git init
git add .
git commit -m "İlk sürüm: Güzin Ders"
git branch -M main
git remote add origin https://github.com/<kullanıcı>/<repo>.git
git push -u origin main
```
Sonra Netlify → **Add new site → Import from Git** → repoyu seç. Build command **boş**,
publish directory **`.`** (zaten `netlify.toml`'dan okunur).

> API anahtarı tarayıcıda `localStorage`'da tutulur; Netlify'a hiçbir sır gönderilmez.
> Statik site olduğu için LLM çağrıları doğrudan tarayıcıdan yapılır (sunucu yok).

---

## 🔑 API Anahtarı (sınırsız quiz için)

1. Uygulamada sağ üstteki ⚙️ **Ayarlar**'a gir.
2. Sağlayıcıyı seç: **Anthropic (Claude)** veya **OpenAI (GPT)**.
3. Kişisel API anahtarını yapıştır ve **Bağlantıyı test et**'e bas.
4. Zorluk, soru sayısı, soru türleri ve "otomatik yeni quiz" tercihini ayarla.

> Anahtar **yalnızca tarayıcının `localStorage`'ında** tutulur; hiçbir sunucuya gönderilmez.
> İstekler doğrudan tarayıcıdan seçtiğin sağlayıcıya gider (Anthropic için
> `anthropic-dangerous-direct-browser-access` başlığı kullanılır).

---

## ➕ Yeni Ders / Materyal Ekleme

Mimari tamamen veriye dayalıdır. Yeni bir ders eklemek için:

1. `data/courses/<id>.js` dosyası oluştur ve şu şekilde dışa aktar:

   ```js
   export default {
     id: "biyoloji",
     title: "Biyoloji",
     subtitle: "Hücre ve Genetik",
     icon: "🧬",
     accent: "#3b7a57",          // herhangi bir CSS rengi — temada kullanılır
     description: "Kısa açıklama…",
     topics: [
       {
         id: "hucre",
         title: "Hücre",
         estMinutes: 20,
         markdown: "### Hücre\n\nMetin…\n\n---\n\n### Hücre Zarı\n\nMetin…"
       }
     ]
   };
   ```
   `markdown` içinde `---` satırları konuyu **çalışma kartlarına** böler; her bölümün ilk
   `### Başlık` satırı kartın başlığı olur.

2. `data/index.js` dosyasında dersi içe aktar ve `COURSES` dizisine ekle. **Hepsi bu** —
   pano, çalışma görünümü, defter ve quiz motoru dersi otomatik olarak tanır.

3. (İsteğe bağlı) `data/seeds.js` içine, API anahtarı olmadan da çalışacak hazır sorular ekle.

---

## 🗂️ Proje Yapısı

```
.
├── index.html              # SPA kabuğu (tek giriş noktası)
├── css/
│   └── styles.css          # Tüm stiller (CSS değişkenleriyle tema)
├── data/
│   ├── index.js            # Ders kaydı (COURSES) — yeni ders buraya eklenir
│   ├── seeds.js            # Çevrimdışı hazır soru bankası
│   └── courses/
│       ├── inkilap.js      # Atatürk İlkeleri ve İnkılap Tarihi
│       ├── edebiyat.js     # Türk Dili ve Edebiyatı
│       └── analog.js       # Analog Elektronik
└── js/
    ├── app.js              # Önyükleme: tema, gezinme, yönlendirme
    ├── router.js           # Hash tabanlı mini yönlendirici
    ├── store.js            # localStorage katmanı (ayarlar/notlar/ilerleme)
    ├── ui.js               # Ortak DOM/yardımcılar (toast, escape, vb.)
    ├── markdown.js         # Bağımlılıksız, güvenli Markdown işleyici
    ├── quizEngine.js       # Saf değerlendirme/puanlama mantığı
    ├── llm.js              # Anthropic/OpenAI entegrasyonu (quiz üretimi)
    └── views/
        ├── dashboard.js    # Ana pano
        ├── study.js        # Konu okuma + defter
        ├── quiz.js         # Quiz motoru + sonsuz üretim döngüsü
        └── settings.js     # Sağlayıcı/anahtar/tercihler/veri yönetimi
```

---

## 🔒 Gizlilik

Sunucu yok, hesap yok. Tüm notların, ilerlemen ve ayarların **yalnızca senin tarayıcında**
saklanır. Ayarlar → Veriler bölümünden JSON olarak yedek alabilir, içe aktarabilir veya
her şeyi temizleyebilirsin.

---

*Güzin Ders · Deniz'in final çalışma platformu.*
