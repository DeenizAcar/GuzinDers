/* ============================================================================
   llm.js — Large-Language-Model integration (the "infinite quiz" engine).

   Supports two providers, called directly from the browser:
     • Anthropic  (Claude Messages API)
     • OpenAI     (Chat Completions API)

   The API key is supplied by Deniz in Settings and stored only in localStorage.
   Browser-direct calls require provider-specific opt-in headers, set below.

   Public API:
     defaultModel(provider)            -> string
     testConnection(settings)          -> { ok, message }
     generateQuiz(settings, params)    -> [questions]
     gradeOpenEnded(settings, payload) -> { correct, score, feedback }
   ========================================================================== */

const PROVIDER = {
  anthropic: {
    url: "https://api.anthropic.com/v1/messages",
    defaultModel: "claude-haiku-4-5-20251001",
    models: ["claude-haiku-4-5-20251001", "claude-sonnet-4-6", "claude-3-5-sonnet-20241022"],
  },
  openai: {
    url: "https://api.openai.com/v1/chat/completions",
    defaultModel: "gpt-4o-mini",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"],
  },
};

export function providerInfo(provider) { return PROVIDER[provider] || PROVIDER.anthropic; }
export function defaultModel(provider) { return providerInfo(provider).defaultModel; }

/* ------------------------------------------------------ Low-level call ----- */
/* Sends a system+user prompt to the configured provider and returns raw text.
   Throws an Error with a human-readable message on failure. */
async function complete(settings, { system, user, maxTokens = 2200, temperature = 0.6 }) {
  const provider = settings.provider === "openai" ? "openai" : "anthropic";
  const info = providerInfo(provider);
  const model = (settings.model || "").trim() || info.defaultModel;
  const key = (settings.apiKey || "").trim();
  if (!key) throw new Error("API anahtarı ayarlı değil. Ayarlar’dan ekleyin.");

  let res, data;
  if (provider === "anthropic") {
    res = await fetch(info.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        // Required to allow calls straight from a browser:
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(apiError(data, res.status));
    // Concatenate any text blocks in the response.
    return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
  } else {
    res = await fetch(info.url, {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(apiError(data, res.status));
    return (data.choices?.[0]?.message?.content || "").trim();
  }
}

function apiError(data, status) {
  const msg = data?.error?.message || data?.error?.type || data?.message;
  if (status === 401) return "API anahtarı geçersiz (401). Anahtarı kontrol edin.";
  if (status === 429) return "İstek sınırı aşıldı (429). Biraz sonra tekrar deneyin.";
  if (status === 400 && msg) return `İstek hatası: ${msg}`;
  return msg ? `API hatası (${status}): ${msg}` : `API hatası (${status}).`;
}

/* ------------------------------------------------ Robust JSON extraction --- */
/* LLMs sometimes wrap JSON in prose or code fences; recover the object safely. */
function extractJson(text) {
  if (!text) throw new Error("Boş yanıt alındı.");
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Yanıt JSON içermiyor.");
  return JSON.parse(candidate.slice(start, end + 1));
}

/* --------------------------------------------------------- Prompt builders - */
const TYPE_LABEL = {
  multiple_choice: "çoktan seçmeli (4 şık)",
  true_false: "doğru/yanlış",
  fill_blank: "boşluk doldurma (boşluğu ___ ile göster)",
  open_ended: "klasik/açık uçlu",
};

const DIFF_HINT = {
  kolay: "tanım ve temel kavram düzeyinde, doğrudan metinden",
  orta: "kavramları ilişkilendiren, orta zorlukta",
  zor: "analiz/çıkarım gerektiren, sınav düzeyinde zor",
};

function buildQuizPrompt(params) {
  const { course, topics, count, types, difficulty, weakTopics = [], avoidQuestions = [] } = params;

  const sourceBlocks = topics
    .map((t) => `### KONU: ${t.title}\n${truncate(t.plainText, 3200)}`)
    .join("\n\n");

  const typeList = types.map((t) => `- ${TYPE_LABEL[t] || t}`).join("\n");
  const weak = weakTopics.length
    ? `\nÖğrencinin zorlandığı konular (bunlara biraz daha ağırlık ver): ${weakTopics.join(", ")}.`
    : "";
  const avoid = avoidQuestions.length
    ? `\nŞu soruları TEKRARLAMA (farklı sorular üret):\n${avoidQuestions.slice(0, 12).map((q) => "• " + q).join("\n")}`
    : "";

  const system =
    "Sen, üniversite öğrencisi Deniz için sınav hazırlayan deneyimli bir öğretim görevlisisin. " +
    "SADECE sana verilen ders materyaline dayanarak, Türkçe ve doğru sorular üretirsin. " +
    "Materyalde olmayan bilgiyi uydurmazsın. Çıktıyı YALNIZCA geçerli JSON olarak verirsin; " +
    "açıklama, başlık veya kod bloğu eklemezsin.";

  const user =
`Ders: ${course}
Zorluk: ${DIFF_HINT[difficulty] || difficulty}
Toplam ${count} soru üret. Soru türlerini şu türler arasından dengeli biçimde dağıt:
${typeList}${weak}${avoid}

Aşağıdaki ders materyalini temel al:
"""
${sourceBlocks}
"""

Çıktı tam olarak şu JSON şemasında olsun:
{
  "questions": [
    {
      "type": "multiple_choice | true_false | fill_blank | open_ended",
      "question": "soru metni (fill_blank için boşluğu ___ ile göster)",
      "options": ["şık1","şık2","şık3","şık4"],   // yalnızca multiple_choice için
      "answer": "doğru cevap",                       // mc: doğru şıkkın metni; true_false: \"Doğru\" veya \"Yanlış\"; fill_blank: boşluğa gelen kelime/kelimeler; open_ended: örnek/model cevap
      "acceptable": ["kabul edilebilir alternatif cevap"], // opsiyonel (özellikle fill_blank)
      "explanation": "kısa açıklama (1-2 cümle)",
      "topicTitle": "sorunun ait olduğu konu başlığı"
    }
  ]
}
Yalnızca JSON döndür.`;

  return { system, user };
}

function truncate(s, n) {
  s = (s || "").trim();
  return s.length > n ? s.slice(0, n) + " …" : s;
}

/* ---------------------------------------------------- Normalize questions -- */
const VALID_TYPES = new Set(["multiple_choice", "true_false", "fill_blank", "open_ended"]);

function normalizeQuestion(q, allowedTypes) {
  if (!q || typeof q !== "object") return null;
  let type = String(q.type || "").trim();
  if (!VALID_TYPES.has(type)) return null;
  if (allowedTypes && allowedTypes.length && !allowedTypes.includes(type)) return null;

  const out = {
    type,
    question: String(q.question || "").trim(),
    explanation: String(q.explanation || "").trim(),
    topicTitle: String(q.topicTitle || "").trim(),
    answer: q.answer,
    acceptable: Array.isArray(q.acceptable) ? q.acceptable.map(String) : [],
  };
  if (!out.question) return null;

  if (type === "multiple_choice") {
    out.options = (Array.isArray(q.options) ? q.options : []).map(String).filter(Boolean);
    if (out.options.length < 2) return null;
    // resolve answer to the exact option text
    let ans = q.answer;
    if (typeof ans === "number" && out.options[ans] != null) ans = out.options[ans];
    out.answer = String(ans).trim();
    if (!out.options.includes(out.answer)) {
      // tolerate letter answers like "B"
      const letter = out.answer.toUpperCase().charCodeAt(0) - 65;
      if (out.options[letter]) out.answer = out.options[letter];
      else return null;
    }
  } else if (type === "true_false") {
    const a = String(q.answer).toLowerCase();
    out.answer = ["true", "doğru", "dogru", "d", "yes"].includes(a) ? "Doğru" : "Yanlış";
  } else {
    out.answer = String(q.answer ?? "").trim();
    if (!out.answer) return null;
  }
  return out;
}

/* ------------------------------------------------------------- Public API -- */

/* Quick credential check with a tiny prompt. */
export async function testConnection(settings) {
  try {
    const txt = await complete(settings, {
      system: "Yalnızca JSON döndür.",
      user: 'Şu JSON\'u aynen döndür: {"ok": true}',
      maxTokens: 40,
      temperature: 0,
    });
    extractJson(txt);
    return { ok: true, message: "Bağlantı başarılı — anahtar çalışıyor." };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}

/* Generate a fresh quiz from the given topics/material. */
export async function generateQuiz(settings, params) {
  const { system, user } = buildQuizPrompt(params);
  const txt = await complete(settings, { system, user, maxTokens: 2600, temperature: 0.7 });
  const obj = extractJson(txt);
  const raw = Array.isArray(obj.questions) ? obj.questions : [];
  const questions = raw.map((q) => normalizeQuestion(q, params.types)).filter(Boolean);
  if (!questions.length) throw new Error("Geçerli soru üretilemedi, tekrar deneyin.");
  return questions;
}

/* Use the LLM to grade a free-text (open-ended) answer against a model answer. */
export async function gradeOpenEnded(settings, { question, modelAnswer, userAnswer }) {
  const system =
    "Bir sınav değerlendiricisisin. Öğrencinin açık uçlu cevabını model cevapla karşılaştır. " +
    "Yalnızca JSON döndür.";
  const user =
`Soru: ${question}
Model cevap: ${modelAnswer}
Öğrenci cevabı: ${userAnswer || "(boş)"}

Değerlendir ve şu JSON'u döndür:
{"score": 0.0-1.0 arası ondalık, "correct": true/false (0.6 ve üzeri true), "feedback": "tek cümle Türkçe geri bildirim"}`;

  const txt = await complete(settings, { system, user, maxTokens: 220, temperature: 0 });
  const obj = extractJson(txt);
  const score = Math.max(0, Math.min(1, Number(obj.score) || 0));
  return {
    score,
    correct: typeof obj.correct === "boolean" ? obj.correct : score >= 0.6,
    feedback: String(obj.feedback || "").trim(),
  };
}
