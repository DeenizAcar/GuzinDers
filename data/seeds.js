/* ============================================================================
   data/seeds.js — Hand-authored starter quizzes (offline practice bank).

   These let Deniz practise immediately, before adding any API key. Once a key
   is configured, the LLM takes over and generates fresh, infinite questions;
   the seeds are then used as a fallback (reshuffled) if a generation call fails.

   Each question matches the schema produced by js/llm.js → normalizeQuestion():
     { type, question, options?, answer, acceptable?, explanation, topicTitle }
   `topicTitle` is matched against the course's topic titles so wrong answers
   feed weak-area tracking.
   ========================================================================== */

const SEEDS = {
  /* ----------------------------------------------------- İnkılap Tarihi --- */
  inkilap: [
    {
      type: "multiple_choice",
      question: "Türkiye Cumhuriyeti hangi tarihte ilan edilmiştir?",
      options: ["23 Nisan 1920", "29 Ekim 1923", "30 Ağustos 1922", "3 Mart 1924"],
      answer: "29 Ekim 1923",
      explanation: "Cumhuriyet 29 Ekim 1923'te ilan edildi ve Mustafa Kemal ilk cumhurbaşkanı seçildi.",
      topicTitle: "Atatürk Dönemi (1922–1938)",
    },
    {
      type: "true_false",
      question: "Saltanat, 1 Kasım 1922'de TBMM tarafından kaldırılmıştır.",
      answer: "Doğru",
      explanation: "Saltanatın kaldırılmasıyla Osmanlı'nın siyasi varlığı sona ermiştir.",
      topicTitle: "Atatürk Dönemi (1922–1938)",
    },
    {
      type: "fill_blank",
      question: "Halifelik ___ tarihinde kaldırılmıştır.",
      answer: "3 Mart 1924",
      acceptable: ["3 mart 1924", "1924", "mart 1924"],
      explanation: "3 Mart 1924'te halifelik kaldırıldı, Tevhid-i Tedrisat ve Şer'iye Vekâleti'nin kaldırılması da aynı gün gerçekleşti.",
      topicTitle: "Çok Partili Hayat, Nutuk ve Atatürk’ün Eserleri",
    },
    {
      type: "multiple_choice",
      question: "Atatürk'ün Nutuk adlı eseri olayları hangi tarihten başlatarak anlatır?",
      options: [
        "Mustafa Kemal'in 19 Mayıs 1919'da Samsun'a çıkışı",
        "Cumhuriyet'in ilanı",
        "Lozan Antlaşması",
        "Birinci Dünya Savaşı'nın başı",
      ],
      answer: "Mustafa Kemal'in 19 Mayıs 1919'da Samsun'a çıkışı",
      explanation: "Nutuk, 1919'da Samsun'a çıkıştan 1927'ye kadarki süreci anlatır ve 1927'de okunmuştur.",
      topicTitle: "Çok Partili Hayat, Nutuk ve Atatürk’ün Eserleri",
    },
    {
      type: "true_false",
      question: "Terakkiperver Cumhuriyet Fırkası, Cumhuriyet döneminin ilk muhalefet partisidir.",
      answer: "Doğru",
      explanation: "1924'te kurulan Terakkiperver Cumhuriyet Fırkası ilk muhalefet partisidir; Şeyh Sait İsyanı sonrası kapatılmıştır.",
      topicTitle: "Çok Partili Hayat, Nutuk ve Atatürk’ün Eserleri",
    },
    {
      type: "multiple_choice",
      question: "Atatürk'ten sonra Türkiye'nin ikinci cumhurbaşkanı kim olmuştur?",
      options: ["Celal Bayar", "İsmet İnönü", "Fevzi Çakmak", "Adnan Menderes"],
      answer: "İsmet İnönü",
      explanation: "1938'de Atatürk'ün vefatının ardından İsmet İnönü ikinci cumhurbaşkanı seçilmiştir.",
      topicTitle: "Atatürk Sonrası Türkiye (1938–1950)",
    },
    {
      type: "true_false",
      question: "Türkiye, II. Dünya Savaşı'na fiilen (silahlı olarak) katılmıştır.",
      answer: "Yanlış",
      explanation: "Türkiye savaş boyunca tarafsız kalmış, savaşa fiilen girmemiştir; sona doğru sembolik olarak Almanya ve Japonya'ya savaş ilan etmiştir.",
      topicTitle: "Atatürk Sonrası Türkiye (1938–1950)",
    },
    {
      type: "open_ended",
      question: "1938–1950 İnönü (Millî Şef) döneminin başlıca özelliklerini kısaca açıklayınız.",
      answer:
        "II. Dünya Savaşı'nın getirdiği ekonomik zorluklar (Varlık Vergisi, Toprak Mahsulleri Vergisi, karne uygulaması), tek parti yönetiminin sürmesi ve 1945'ten itibaren çok partili hayata geçiş (Demokrat Parti'nin kuruluşu) bu dönemin başlıca özellikleridir.",
      explanation: "Dönem, savaş ekonomisi ve çok partili hayata geçiş hazırlıklarıyla anılır.",
      topicTitle: "Atatürk Sonrası Türkiye (1938–1950)",
    },
    {
      type: "fill_blank",
      question: "1950 seçimlerini kazanarak iktidara gelen parti ___ Partisi'dir.",
      answer: "Demokrat",
      acceptable: ["demokrat", "demokrat parti", "dp"],
      explanation: "14 Mayıs 1950'de Demokrat Parti iktidara geldi; Celal Bayar cumhurbaşkanı, Adnan Menderes başbakan oldu.",
      topicTitle: "Menderes Dönemi (1950–1960)",
    },
    {
      type: "multiple_choice",
      question: "27 Mayıs 1960 askerî darbesi hangi hükümete karşı yapılmıştır?",
      options: [
        "İsmet İnönü hükümeti",
        "Adnan Menderes (Demokrat Parti) hükümeti",
        "Bülent Ecevit hükümeti",
        "Süleyman Demirel hükümeti",
      ],
      answer: "Adnan Menderes (Demokrat Parti) hükümeti",
      explanation: "27 Mayıs 1960 darbesi Demokrat Parti iktidarını devirmiş, ardından 1961 Anayasası hazırlanmıştır.",
      topicTitle: "Darbeler Dönemi (1960–2000)",
    },
    {
      type: "multiple_choice",
      question: "12 Eylül 1980 darbesinin lideri olan Genelkurmay Başkanı kimdir?",
      options: ["Cemal Gürsel", "Kenan Evren", "Cevdet Sunay", "Fahri Korutürk"],
      answer: "Kenan Evren",
      explanation: "12 Eylül 1980 darbesinin lideri Kenan Evren'dir; 1982 Anayasası bu dönemde hazırlanmıştır.",
      topicTitle: "Darbeler Dönemi (1960–2000)",
    },
    {
      type: "true_false",
      question: "1961 Anayasası, 27 Mayıs 1960 darbesinin ardından hazırlanmıştır.",
      answer: "Doğru",
      explanation: "1961 Anayasası görece özgürlükçü bir anayasa olarak 1960 darbesi sonrası kabul edilmiştir.",
      topicTitle: "Darbeler Dönemi (1960–2000)",
    },
  ],

  /* --------------------------------------------------- Türk Edebiyatı ----- */
  edebiyat: [
    {
      type: "multiple_choice",
      question: "Türk şiirinde millî ölçü olarak kabul edilen ölçü hangisidir?",
      options: ["Aruz ölçüsü", "Hece ölçüsü", "Serbest ölçü", "Redif"],
      answer: "Hece ölçüsü",
      explanation: "Hece ölçüsü, dizelerdeki hece sayısının eşitliğine dayanır ve halk şiirinin millî ölçüsüdür.",
      topicTitle: "Şiir – I (Türler ve Şiir Bilgisi)",
    },
    {
      type: "true_false",
      question: "Redif, dize sonlarında kafiyeden sonra gelen, aynı görevdeki ek ya da sözcüklerdir.",
      answer: "Doğru",
      explanation: "Kafiye ses benzerliği iken redif, aynı görev ve anlamdaki yinelenen ek/sözcüklerdir.",
      topicTitle: "Şiir – I (Türler ve Şiir Bilgisi)",
    },
    {
      type: "fill_blank",
      question: "Şiirde dize sonlarındaki ses benzerliğine ___ denir.",
      answer: "kafiye",
      acceptable: ["uyak", "kafiye"],
      explanation: "Kafiye (uyak), dize sonlarındaki farklı görevdeki seslerin benzerliğidir.",
      topicTitle: "Şiir – I (Türler ve Şiir Bilgisi)",
    },
    {
      type: "multiple_choice",
      question: "Garip (Birinci Yeni) hareketinin öncü şairi kimdir?",
      options: ["Orhan Veli Kanık", "Necip Fazıl Kısakürek", "Cemal Süreya", "Yahya Kemal Beyatlı"],
      answer: "Orhan Veli Kanık",
      explanation: "Garip akımı; Orhan Veli, Oktay Rifat ve Melih Cevdet tarafından başlatılmış, ölçü-kafiyeyi reddetmiştir.",
      topicTitle: "Şiir – II (Cumhuriyet Dönemi Toplulukları)",
    },
    {
      type: "open_ended",
      question: "Anlatım bozukluğuna yol açan başlıca nedenleri kısaca açıklayınız.",
      answer:
        "Gereksiz sözcük kullanımı, anlamca çelişen sözcükler, yanlış anlamda sözcük kullanımı, deyim/atasözü yanlışları gibi anlama dayalı bozukluklar; özne-yüklem ve tamlama uyumsuzlukları, eksik öge, yanlış ek kullanımı gibi yapıya dayalı bozukluklar anlatım bozukluğunun başlıca nedenleridir.",
      explanation: "Anlatım bozuklukları temel olarak anlama dayalı ve yapıya (dil bilgisine) dayalı olmak üzere ikiye ayrılır.",
      topicTitle: "Anlatım ve Anlatım Bozuklukları",
    },
    {
      type: "multiple_choice",
      question: "Bir düşünceyi kanıtlamak amacıyla yazılan, gazete ve dergilerde yayımlanan öğretici metin türü hangisidir?",
      options: ["Makale", "Öykü", "Şiir", "Roman"],
      answer: "Makale",
      explanation: "Makale, bir görüşü/bilgiyi kanıtlara dayanarak savunan öğretici metin türüdür.",
      topicTitle: "Düşünce Değeri Olan Metinler – I",
    },
    {
      type: "true_false",
      question: "Deneme, yazarın kesin yargılar ve kanıtlarla görüşünü ispatladığı bir türdür.",
      answer: "Yanlış",
      explanation: "Denemede yazar kesin sonuçlara/ispata kaygı gütmez; serbestçe, samimi bir biçimde düşüncelerini paylaşır.",
      topicTitle: "Düşünce Değeri Olan Metinler – I",
    },
    {
      type: "fill_blank",
      question: "Bir topluluğa belli bir konuda bilgi vermek için yapılan hazırlıklı sözlü anlatım türüne ___ denir.",
      answer: "konferans",
      acceptable: ["konferans", "sunum"],
      explanation: "Konferans; uzman bir kişinin bir konuyu topluluğa aktardığı hazırlıklı sözlü anlatım türüdür.",
      topicTitle: "Sözlü Anlatım Türleri",
    },
    {
      type: "multiple_choice",
      question: "Bir kompozisyonun (yazının) temel bölümleri sırasıyla hangileridir?",
      options: [
        "Giriş – Gelişme – Sonuç",
        "Başlık – Özet – Kaynakça",
        "Serim – Düğüm – Çözüm",
        "Giriş – Sonuç – Ek",
      ],
      answer: "Giriş – Gelişme – Sonuç",
      explanation: "Kompozisyon giriş, gelişme ve sonuç bölümlerinden oluşur; her bölümün kendine özgü işlevi vardır.",
      topicTitle: "Kompozisyon ve Bilimsel Yazma",
    },
    {
      type: "true_false",
      question: "Çehov tarzı öykü, belirgin bir olaydan çok bir durumu/kesiti işleyen durum öyküsüdür.",
      answer: "Doğru",
      explanation: "Çehov (durum/kesit) öyküsü bir an veya durumu işlerken, Maupassant tarzı olay öyküsü serim-düğüm-çözüm içerir.",
      topicTitle: "Öykü (Hikâye)",
    },
    {
      type: "fill_blank",
      question: "Yaşanmış ya da yaşanması mümkün olayları yer, zaman ve kişiye bağlayarak anlatan kısa anlatı türü ___ tür.",
      answer: "öykü",
      acceptable: ["öykü", "oyku", "hikaye", "hikâye"],
      explanation: "Öykü (hikâye), romana göre daha kısa, tek bir olay/durum çevresinde gelişen anlatı türüdür.",
      topicTitle: "Öykü (Hikâye)",
    },
    {
      type: "multiple_choice",
      question: "Okuduğunu doğru anlamak için en uygun okuma biçimi aşağıdakilerden hangisidir?",
      options: [
        "Anlamı sorgulayan etkin (aktif) okuma",
        "Sadece göz gezdirme",
        "Sözcükleri tek tek sesli heceleme",
        "Yalnızca başlıkları okuma",
      ],
      answer: "Anlamı sorgulayan etkin (aktif) okuma",
      explanation: "Etkin okuma; metni sorgulayarak, ana düşünceyi ve yardımcı düşünceleri ayırt ederek okumaktır.",
      topicTitle: "Okuma, Dinleme ve Konuşma",
    },
  ],

  /* --------------------------------------------------- Analog Elektronik -- */
  analog: [
    {
      type: "multiple_choice",
      question: "Elektronikte en yaygın kullanılan yarı iletken malzeme hangisidir?",
      options: ["Bakır", "Silisyum", "Alüminyum", "Demir"],
      answer: "Silisyum",
      explanation: "Silisyum (Si), bol bulunması ve uygun yasak enerji aralığı nedeniyle en yaygın yarı iletkendir.",
      topicTitle: "Yarı İletkenler",
    },
    {
      type: "fill_blank",
      question: "Silisyum bir diyotun iletime geçtiği eşik (eklem) gerilimi yaklaşık ___ V'tur.",
      answer: "0,7",
      acceptable: ["0.7", "0,7", "0.7 v", "0,7 v", "0,7v", "0.7v"],
      explanation: "Silisyum diyotlarda ileri yön eşik gerilimi ~0,7 V, germanyumda ~0,3 V'tur.",
      topicTitle: "Diyot: Giriş ve Yapısı",
    },
    {
      type: "true_false",
      question: "Bir diyot, doğru (ileri) polarmada iletime geçer ve akım iletir.",
      answer: "Doğru",
      explanation: "İleri polarmada potansiyel engeli aşılır ve diyot iletime geçer; ters polarmada yalıtkan gibi davranır.",
      topicTitle: "Diyot: Giriş ve Yapısı",
    },
    {
      type: "true_false",
      question: "Yarım dalga doğrultucu, giriş işaretinin yalnızca bir yarı periyodunu çıkışa aktarır.",
      answer: "Doğru",
      explanation: "Yarım dalga doğrultucu tek diyotla yalnızca bir alternansı geçirir; bu yüzden verimi düşüktür.",
      topicTitle: "Doğrultucular (Yarım Dalga)",
    },
    {
      type: "multiple_choice",
      question: "Tam dalga doğrultucu çıkışındaki dalgalanma (ripple) frekansı, şebeke frekansının kaç katıdır?",
      options: ["Yarısı", "1 katı (aynı)", "2 katı", "4 katı"],
      answer: "2 katı",
      explanation: "Tam dalga doğrultucu her iki alternansı da çıkışa aktardığından ripple frekansı giriş frekansının 2 katıdır.",
      topicTitle: "Tam Dalga Doğrultucular",
    },
    {
      type: "multiple_choice",
      question: "Doğrultucu çıkışındaki dalgalanmayı (ripple) azaltıp DC'yi düzgünleştirmek için en yaygın kullanılan eleman hangisidir?",
      options: ["Seri direnç", "Paralel kondansatör (filtre)", "Anahtar", "Sigorta"],
      answer: "Paralel kondansatör (filtre)",
      explanation: "Çıkışa paralel bağlanan kondansatör, gerilim düştüğünde deşarj olarak dalgalanmayı azaltır.",
      topicTitle: "Filtreler",
    },
    {
      type: "fill_blank",
      question: "Ters polarmada kırılma (breakdown) bölgesinde çalışarak sabit gerilim sağlayan, regülasyonda kullanılan diyot ___ diyottur.",
      answer: "zener",
      acceptable: ["zener"],
      explanation: "Zener diyot, ters kırılma bölgesinde uçlarındaki gerilimi sabit tutarak gerilim regülasyonu sağlar.",
      topicTitle: "Zener Diyot",
    },
    {
      type: "true_false",
      question: "Zener diyot, gerilim regülatörü devresinde doğru (ileri) polarmada çalıştırılır.",
      answer: "Yanlış",
      explanation: "Zener diyot regülatörde ters (reverse) polarmada, kırılma bölgesinde çalıştırılır.",
      topicTitle: "Zener Diyot",
    },
    {
      type: "multiple_choice",
      question: "Bir BJT (çift kutuplu jonksiyon transistör) elemanının üç ucu hangileridir?",
      options: [
        "Anot – Katot – Geçit",
        "Emiter – Beyz – Kolektör",
        "Kaynak – Geçit – Akaç",
        "Giriş – Çıkış – Toprak",
      ],
      answer: "Emiter – Beyz – Kolektör",
      explanation: "BJT'nin üç ucu emiter (E), beyz (B) ve kolektör (C)'dür.",
      topicTitle: "Transistör Temelleri",
    },
    {
      type: "open_ended",
      question: "Bir transistörün anahtar (switch) olarak çalışması için hangi iki bölgede çalıştırıldığını ve bunların anlamını açıklayınız.",
      answer:
        "Transistör anahtar olarak kesim (cut-off) ve doyum (saturation) bölgelerinde çalıştırılır. Kesimde beyz akımı yoktur, transistör iletmez (açık anahtar / OFF). Doyumda beyz yeterince sürülür, kolektör-emiter arası kısa devreye yakın olur (kapalı anahtar / ON). Aktif bölge ise yükselteç çalışması içindir.",
      explanation: "Anahtarlamada amaç tam ON/OFF; aktif bölge kullanılmaz.",
      topicTitle: "Transistör: Anahtarlama",
    },
    {
      type: "fill_blank",
      question: "Bir transistörün yükselteç olarak çalışması için aktif bölgede beyz-emiter jonksiyonu ___ polarmalanmalıdır.",
      answer: "doğru",
      acceptable: ["ileri", "dogru", "doğru", "forward"],
      explanation: "Aktif bölgede beyz-emiter ileri (doğru), beyz-kolektör ters polarmalanır.",
      topicTitle: "Transistör: Yükselteç",
    },
    {
      type: "multiple_choice",
      question: "FET'in BJT'ye göre en temel farkı aşağıdakilerden hangisidir?",
      options: [
        "Akım kontrollü olması",
        "Gerilim kontrollü ve yüksek giriş empedanslı olması",
        "Yalnızca DC'de çalışması",
        "Üç uçlu olmaması",
      ],
      answer: "Gerilim kontrollü ve yüksek giriş empedanslı olması",
      explanation: "BJT akım kontrollü iken FET gerilim (geçit gerilimi) kontrollüdür ve giriş empedansı çok yüksektir.",
      topicTitle: "FET ve PNPN Elemanları",
    },
    {
      type: "true_false",
      question: "Kırpıcı (clipper) devreler, bir işaretin belirli bir gerilim seviyesinin üstünü veya altını kırpar (sınırlar).",
      answer: "Doğru",
      explanation: "Kırpıcılar diyot ve referans gerilimi kullanarak işaretin bir kısmını keser; dalga şeklini sınırlar.",
      topicTitle: "Kırpıcı (Clipper) Devreler",
    },
    {
      type: "fill_blank",
      question: "Bir işaretin DC seviyesini (referansını) kaydıran, dalga şeklini değiştirmeyen devreye ___ (clamper) devresi denir.",
      answer: "kenetleyici",
      acceptable: ["kenetleyici", "clamper", "kenetleme"],
      explanation: "Kenetleyici devre, kondansatör ve diyotla işaretin DC seviyesini yukarı/aşağı kaydırır.",
      topicTitle: "Kenetleyici (Clamper) Devreler",
    },
  ],
};

/* Return a shallow copy of the seed bank for a course (empty array if none). */
export function seedsFor(courseId) {
  return (SEEDS[courseId] || []).map((q) => ({ ...q, acceptable: [...(q.acceptable || [])] }));
}

export default SEEDS;
