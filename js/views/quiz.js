/* ============================================================================
   views/quiz.js — The assessment engine + the headline "infinite quiz" loop.

   • Renders a full quiz supporting all four formats: multiple choice,
     true/false, fill-in-the-blank and open-ended.
   • Grades objective questions locally (quizEngine); grades open-ended via the
     LLM when a key is set, otherwise lets the learner self-assess.
   • THE KEY FEATURE: when a quiz is submitted, the app does not stop. If an API
     key is configured it immediately asks the LLM to generate a brand-new quiz
     — biased toward the topics the learner got wrong and avoiding repeats — and
     rolls straight into it. With no key, it reshuffles the offline seed bank so
     practice still never ends.
   ========================================================================== */

import { getCourse, getTopic } from "../../data/index.js";
import { Settings, Progress } from "../store.js";
import { toPlainText, renderMarkdown } from "../markdown.js";
import { generateQuiz, gradeOpenEnded } from "../llm.js";
import { gradeQuestion, heuristicOpenEnded, summarize } from "../quizEngine.js";
import { seedsFor } from "../../data/seeds.js";
import { mount, setAppAccent, escapeHtml, toast, TYPE_LABELS } from "../ui.js";

/* Current quiz session state. */
let session = null; // { course, topicId, sourceTopics, questions, round }

/* --------------------------------------------------------- Source selection */

/* Choose which topics feed question generation. Topic-scoped quiz → that topic;
   course-wide → a rotating handful, prioritising the learner's weak topics. */
function pickSourceTopics(course, topicId, round) {
  if (topicId) {
    const t = getTopic(course.id, topicId);
    return t ? [t] : course.topics.slice(0, 1);
  }
  const weakTitles = new Set(Progress.weakTopics(course.id, 3));
  const weak = course.topics.filter((t) => weakTitles.has(t.title));
  const rest = course.topics.filter((t) => !weakTitles.has(t.title));
  // rotate the "rest" selection a little each round so coverage varies
  const start = (round * 2) % Math.max(rest.length, 1);
  const rotated = rest.slice(start).concat(rest.slice(0, start));
  return [...weak, ...rotated].slice(0, 4);
}

function llmParams(course, sourceTopics, avoidQuestions) {
  const s = Settings.get();
  return {
    course: course.title,
    topics: sourceTopics.map((t) => ({ title: t.title, plainText: toPlainText(t.markdown) })),
    count: s.questionCount,
    types: s.enabledTypes,
    difficulty: s.difficulty,
    weakTopics: Progress.weakTopics(course.id, 3),
    avoidQuestions,
  };
}

/* Shuffle a COPY of an array (Fisher–Yates) without mutating the original. */
function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* Pull a FRESH, non-repeating batch from the offline question bank.

   This is the engine behind "Yeni test": every round draws questions that
   haven't been served yet this session, biases the most-missed (weak) topics
   to the front, and — once the eligible pool runs low — resets the rotation
   so practice never runs out. With 100+ questions per course this yields many
   distinct tests before anything repeats. */
function seedQuiz(course) {
  const s = Settings.get();
  const need = Math.max(s.questionCount, 1);
  const all = seedsFor(course.id);

  // 1) Respect enabled question types (fall back to everything if that empties).
  let pool = all.filter((q) => s.enabledTypes.includes(q.type));
  if (!pool.length) pool = all.slice();

  // 2) If opened from a single topic, prefer that topic — but only if it can
  //    fill a whole round; otherwise stay course-wide for variety.
  if (session && session.topicId) {
    const tTitle = getTopic(course.id, session.topicId)?.title;
    const topicPool = pool.filter((q) => q.topicTitle === tTitle);
    if (topicPool.length >= need) pool = topicPool;
  }

  // 3) Drop questions already asked this session; reset when nearly drained.
  const asked = new Set((session && session.asked) || []);
  let fresh = pool.filter((q) => !asked.has(q.question));
  if (fresh.length < need) {
    if (session) session.asked = [];      // bank cycled → start a clean rotation
    fresh = pool.slice();
  }

  // 4) Weak-topic bias: serve most-missed topics first, then the rest.
  const weak = new Set(Progress.weakTopics(course.id));
  const ordered = weak.size
    ? shuffled(fresh.filter((q) => weak.has(q.topicTitle)))
        .concat(shuffled(fresh.filter((q) => !weak.has(q.topicTitle))))
    : shuffled(fresh);

  return ordered.slice(0, need);
}

/* ------------------------------------------------------------- Entry point */

export async function render({ params }) {
  const course = getCourse(params.courseId);
  if (!course) { notFound(); return; }
  setAppAccent(course.accent);

  const topicId = params.topicId || null;
  const topicLabel = topicId ? getTopic(course.id, topicId)?.title : null;
  session = { course, topicId, round: 0, asked: [] };

  // Build the first quiz. Prefer the LLM if a key exists; fall back to seeds.
  let questions;
  if (Settings.hasKey()) {
    renderLoading(course, topicLabel, "İlk quiz hazırlanıyor…");
    try {
      const src = pickSourceTopics(course, topicId, 0);
      questions = await generateQuiz(Settings.get(), llmParams(course, src, []));
    } catch (err) {
      toast("Üretim başarısız: " + err.message + " — hazır sorulara geçildi.", "err");
      questions = seedQuiz(course);
    }
  } else {
    questions = seedQuiz(course);
  }

  if (!questions || !questions.length) {
    mount(`<div class="empty"><div class="big">🗂️</div><h2>Soru bulunamadı</h2>
      <p>Bu ders için soru bankası henüz hazır değil. Ayarlardan etkin soru
      türlerini kontrol edebilirsin. <a href="#/settings" style="color:var(--accent)">Ayarlar →</a></p></div>`);
    return;
  }
  startRound(questions, topicLabel);
}

/* ---------------------------------------------------------- Rendering a round */

function renderLoading(course, topicLabel, msg) {
  mount(`
    <nav class="crumbs"><a href="#/">Ana sayfa</a><span>›</span>
      <a href="#/course/${encodeURIComponent(course.id)}">${escapeHtml(course.title)}</a><span>›</span>
      <span>Quiz</span></nav>
    <div class="quiz-wrap">
      <div class="gen-banner"><span class="spinner"></span>
        <span><b>${escapeHtml(msg)}</b><br><span style="color:var(--muted);font-size:13px">
        ${escapeHtml(topicLabel || course.title)} · yapay zeka çalışıyor</span></span></div>
    </div>`);
}

function startRound(questions, topicLabel) {
  session.questions = questions;
  // Keep the FULL session history so "Yeni test" can skip everything already
  // asked until the bank cycles (seedQuiz resets it when the pool runs low).
  session.asked = session.asked.concat(questions.map((q) => q.question));
  session.round += 1;

  const { course, topicId } = session;
  const s = Settings.get();

  mount(`
    <nav class="crumbs reveal"><a href="#/">Ana sayfa</a><span>›</span>
      <a href="#/course/${encodeURIComponent(course.id)}">${escapeHtml(course.title)}</a><span>›</span>
      <span>Quiz</span></nav>

    <div class="quiz-wrap reveal" style="--d:50ms">
      <div id="resultSlot"></div>

      <div class="page-head" style="margin-bottom:18px">
        <span class="eyebrow">Quiz · ${session.round}. tur</span>
        <h1 class="page-title" style="font-size:clamp(24px,4vw,34px)">${escapeHtml(topicLabel || course.title)}</h1>
        <p class="page-sub">${questions.length} soru · ${escapeHtml(diffLabel(s.difficulty))}${Settings.hasKey() ? " · yapay zeka üretimi" : " · soru bankası"}</p>
      </div>

      <div id="questions">
        ${questions.map((q, i) => qcard(q, i)).join("")}
      </div>

      <div class="btn-row" style="margin-top:8px;margin-bottom:40px">
        <button class="btn btn--primary" id="submitQuiz">Cevapları kontrol et</button>
        <a class="btn btn--ghost" href="#/course/${encodeURIComponent(course.id)}">Çalışmaya dön</a>
      </div>
    </div>
  `);

  wireRunning();
}

function diffLabel(d) {
  return { kolay: "kolay", orta: "orta", zor: "zor" }[d] || d;
}

/* Markup for a single question card (pre-submission). */
function qcard(q, i) {
  const head = `<div class="qcard__type">${escapeHtml(TYPE_LABELS[q.type] || q.type)} · ${i + 1}</div>`;
  let body = "";

  if (q.type === "multiple_choice") {
    const keys = ["A", "B", "C", "D", "E", "F"];
    body = `<div class="opts" data-q="${i}">` + q.options.map((opt, k) => `
      <button type="button" class="opt" data-value="${escapeHtml(opt)}">
        <span class="key">${keys[k] || k + 1}</span><span>${escapeHtml(opt)}</span>
      </button>`).join("") + `</div>`;
  } else if (q.type === "true_false") {
    body = `<div class="tf-row" data-q="${i}">
      <button type="button" class="opt" data-value="Doğru"><span class="key">D</span><span>Doğru</span></button>
      <button type="button" class="opt" data-value="Yanlış"><span class="key">Y</span><span>Yanlış</span></button>
    </div>`;
  } else if (q.type === "fill_blank") {
    body = `<input class="fieldline" type="text" data-q="${i}" autocomplete="off"
      placeholder="Boşluğa gelecek cevabı yaz…" />`;
  } else { // open_ended
    body = `<textarea class="fieldline" data-q="${i}" placeholder="Cevabını kendi cümlelerinle yaz…"></textarea>`;
  }

  // Render the question, turning ___ into a styled blank for fill-in items.
  const qText = q.type === "fill_blank"
    ? escapeHtml(q.question).replace(/_{2,}/g, '<span class="blank"></span>')
    : escapeHtml(q.question);

  return `
    <article class="qcard" data-index="${i}" data-type="${q.type}">
      ${head}
      <p class="qcard__q">${qText}</p>
      ${body}
      <div class="feedback" id="fb-${i}" style="display:none"></div>
    </article>`;
}

/* Wire selection behaviour for the running quiz. */
function wireRunning() {
  // Single-select option groups (MC + T/F)
  document.querySelectorAll(".opts, .tf-row").forEach((group) => {
    group.querySelectorAll(".opt").forEach((opt) => {
      opt.addEventListener("click", () => {
        if (opt.disabled) return;
        group.querySelectorAll(".opt").forEach((o) => o.classList.remove("sel"));
        opt.classList.add("sel");
      });
    });
  });
  document.getElementById("submitQuiz").addEventListener("click", onSubmit);
}

/* ------------------------------------------------------------- Grading */

async function onSubmit() {
  const btn = document.getElementById("submitQuiz");
  btn.disabled = true; btn.textContent = "Kontrol ediliyor…";

  const { questions } = session;
  const results = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const userAnswer = readAnswer(i, q.type);
    let correct = null;

    if (q.type === "open_ended") {
      correct = await gradeOpen(i, q, userAnswer); // may be null → self-grade pending
    } else {
      correct = gradeQuestion(q, userAnswer).correct;
      paintObjective(i, q, userAnswer, correct);
    }
    results.push({ q, userAnswer, correct });
  }

  session.results = results;
  freezeInputs();
  renderResults();
}

/* Read the learner's answer for question i from the DOM. */
function readAnswer(i, type) {
  if (type === "multiple_choice" || type === "true_false") {
    const sel = document.querySelector(`.qcard[data-index="${i}"] .opt.sel`);
    return sel ? sel.dataset.value : "";
  }
  const field = document.querySelector(`.qcard[data-index="${i}"] [data-q="${i}"]`);
  return field ? field.value : "";
}

/* Paint correct/wrong styling + feedback for an objective question. */
function paintObjective(i, q, userAnswer, correct) {
  const card = document.querySelector(`.qcard[data-index="${i}"]`);
  // Highlight options for MC / T/F
  card.querySelectorAll(".opt").forEach((opt) => {
    const v = opt.dataset.value;
    if (sameText(v, q.answer)) opt.classList.add("correct");
    else if (opt.classList.contains("sel")) opt.classList.add("wrong");
  });
  const fb = document.getElementById(`fb-${i}`);
  fb.style.display = "block";
  fb.className = "feedback " + (correct ? "ok" : "no");
  const yourLine = (q.type === "fill_blank")
    ? `<span class="lbl">${correct ? "Doğru ✓" : "Yanlış ✕"}</span>Senin cevabın: <b>${escapeHtml(userAnswer || "(boş)")}</b>`
    : `<span class="lbl">${correct ? "Doğru ✓" : "Yanlış ✕"}</span>`;
  fb.innerHTML = `${yourLine}<br>Doğru cevap: <b>${escapeHtml(q.answer)}</b>` +
    (q.explanation ? `<br><span style="color:var(--ink-soft)">${escapeHtml(q.explanation)}</span>` : "");
}

/* Grade an open-ended answer: LLM when possible, else self-grading UI. */
async function gradeOpen(i, q, userAnswer) {
  const fb = document.getElementById(`fb-${i}`);
  fb.style.display = "block";

  if (Settings.hasKey()) {
    fb.className = "feedback";
    fb.innerHTML = `<span class="spinner" style="display:inline-block;vertical-align:middle"></span> Değerlendiriliyor…`;
    try {
      const res = await gradeOpenEnded(Settings.get(), {
        question: q.question, modelAnswer: q.answer, userAnswer,
      });
      fb.className = "feedback " + (res.correct ? "ok" : "no");
      fb.innerHTML =
        `<span class="lbl">${res.correct ? "Doğru kabul edildi ✓" : "Eksik / yanlış ✕"} (puan: ${(res.score * 100) | 0}%)</span>` +
        (res.feedback ? `${escapeHtml(res.feedback)}<br>` : "") +
        `<span style="color:var(--ink-soft)">Model cevap: ${escapeHtml(q.answer)}</span>`;
      return res.correct;
    } catch (err) {
      // fall through to self-grade on error
      toast("Açık uçlu değerlendirme hatası: " + err.message, "err");
    }
  }

  // Offline: heuristic hint + manual self-grade chips.
  const hint = heuristicOpenEnded(q.answer, userAnswer);
  fb.className = "feedback";
  fb.innerHTML = `
    <span class="lbl">Model cevap</span>
    <span style="color:var(--ink-soft)">${escapeHtml(q.answer)}</span>
    ${q.explanation ? `<br><span style="color:var(--muted)">${escapeHtml(q.explanation)}</span>` : ""}
    <div class="selfgrade">
      <span>Kendini değerlendir:</span>
      <button class="chip" data-sg="1" data-i="${i}">Doğru bildim</button>
      <button class="chip" data-sg="0" data-i="${i}">Bilemedim</button>
      <span style="color:var(--faint)">ipucu: ~%${(hint.score * 100) | 0} örtüşme</span>
    </div>`;
  // Self-grade buttons update the recorded result and the score ring live.
  fb.querySelectorAll(".chip[data-sg]").forEach((chip) => {
    chip.addEventListener("click", () => {
      const val = chip.dataset.sg === "1";
      const r = session.results?.[i];
      if (r) { r.correct = val; }
      fb.querySelectorAll(".chip[data-sg]").forEach((c) => c.classList.remove("on"));
      chip.classList.add("on");
      fb.classList.remove("ok", "no");
      fb.classList.add(val ? "ok" : "no");
      refreshScore();
    });
  });
  return null; // pending self-grade; counted as incorrect until chosen
}

function sameText(a, b) {
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

/* Disable all inputs/options after submission. */
function freezeInputs() {
  document.querySelectorAll(".qcard .opt").forEach((o) => (o.disabled = true));
  document.querySelectorAll(".qcard .fieldline").forEach((f) => (f.disabled = true));
  const btn = document.getElementById("submitQuiz");
  if (btn) btn.style.display = "none";
}

/* ------------------------------------------------------------- Results */

function renderResults() {
  const sum = summarize(session.results.map((r) => ({ q: r.q, correct: r.correct === true })));
  // Log to history (drives stats + weak-topic biasing of future quizzes).
  Progress.logQuiz({
    courseId: session.course.id,
    topicId: session.topicId,
    score: sum.score,
    correct: sum.correctCount,
    total: sum.total,
    missedTopics: sum.missedTopics,
    round: session.round,
  });

  const slot = document.getElementById("resultSlot");
  slot.innerHTML = resultHeroHtml(sum);
  slot.scrollIntoView({ behavior: "smooth", block: "start" });

  wireResultActions();
  maybeAutoGenerateNext();
}

function resultHeroHtml(sum) {
  const verdict =
    sum.score >= 80 ? "Harika! Bu konuya hâkimsin 🎯" :
    sum.score >= 50 ? "İyi gidiyor — birkaç nokta daha 💪" :
    "Tekrar çalışmaya değer 📚";
  const weak = sum.missedTopics.length
    ? `<p class="page-sub" style="margin:6px auto 0">Zayıf alan: <b>${escapeHtml(sum.missedTopics.join(", "))}</b></p>` : "";
  return `
    <section class="result-hero reveal">
      <div class="ring" style="--p:${sum.score}"><span class="ring__num">${sum.score}<small>%</small></span></div>
      <h2>${escapeHtml(verdict)}</h2>
      <p>${sum.correctCount} / ${sum.total} doğru</p>
      ${weak}
      <div id="nextSlot"></div>
      <div class="btn-row" style="justify-content:center;margin-top:18px" id="resultBtns">
        <button class="btn btn--primary" id="genNext">${Settings.hasKey() ? "✨ Yeni quiz üret" : "🔀 Yeni test (bankadan)"}</button>
        <a class="btn btn--ghost" href="#/study/${encodeURIComponent(session.course.id)}/${encodeURIComponent(session.topicId || (session.course.topics[0]?.id || ""))}">Konuya dön</a>
        <a class="btn btn--ghost" href="#/">Ana sayfa</a>
      </div>
    </section>
    <hr style="border:none;border-top:1px solid var(--line);margin:26px 0" />`;
}

function wireResultActions() {
  const btn = document.getElementById("genNext");
  if (btn) btn.addEventListener("click", () => generateNext(true));
}

/* The "must not stop" loop: keep practice flowing after each test. */
function maybeAutoGenerateNext() {
  const s = Settings.get();
  if (s.autoNext && Settings.hasKey()) {
    generateNext(false);                 // online: auto-roll into an LLM quiz
    return;
  }
  // Offline: let the learner review the score, then pull a fresh batch on demand.
  if (!Settings.hasKey()) {
    const nextSlot = document.getElementById("nextSlot");
    if (nextSlot) {
      const bankSize = seedsFor(session.course.id).length;
      nextSlot.innerHTML = `<div class="note-banner" style="margin-top:16px;text-align:left">
        <span style="font-size:18px">🗂️</span>
        <span>Bu derste <b>${bankSize}</b> soruluk bir banka var. Her <b>Yeni test</b>'te
        farklı ve tekrarsız sorular gelir; en çok yanıldığın konular öne alınır —
        yani pratik hiç bitmez.</span>
      </div>`;
    }
  }
}

/* Generate (or reshuffle) the next quiz and roll straight into it. */
async function generateNext(manual) {
  const { course, topicId } = session;
  const topicLabel = topicId ? getTopic(course.id, topicId)?.title : null;

  if (!Settings.hasKey()) {
    // Offline (no API): pull a fresh, non-repeating batch from the bank.
    startRound(seedQuiz(course), topicLabel);
    return;
  }

  const nextSlot = document.getElementById("nextSlot");
  const btns = document.getElementById("resultBtns");
  if (btns) btns.style.display = "none";
  if (nextSlot) {
    nextSlot.innerHTML = `<div class="gen-banner"><span class="spinner"></span>
      <span><b>Performansına göre yeni quiz hazırlanıyor…</b><br>
      <span style="color:var(--muted);font-size:13px">zayıf konulara ağırlık veriliyor</span></span></div>`;
  }

  try {
    const src = pickSourceTopics(course, topicId, session.round);
    const questions = await generateQuiz(Settings.get(), llmParams(course, src, session.asked));
    startRound(questions, topicLabel);
    if (!manual) toast("Yeni quiz hazır — bol şans! 🎯");
  } catch (err) {
    toast("Yeni quiz üretilemedi: " + err.message, "err");
    if (btns) btns.style.display = "";
    if (nextSlot) nextSlot.innerHTML =
      `<div class="note-banner" style="margin-top:16px"><span>⚠️</span><span>${escapeHtml(err.message)}
      — tekrar deneyebilir veya karışık hazır sorulara geçebilirsin.</span></div>`;
  }
}

/* Live-update the score ring when an open-ended answer is self-graded. */
function refreshScore() {
  if (!session?.results) return;
  const sum = summarize(session.results.map((r) => ({ q: r.q, correct: r.correct === true })));
  const ring = document.querySelector(".ring");
  const num = document.querySelector(".ring__num");
  if (ring) ring.style.setProperty("--p", sum.score);
  if (num) num.innerHTML = `${sum.score}<small>%</small>`;
  const p = document.querySelector(".result-hero p");
  if (p) p.textContent = `${sum.correctCount} / ${sum.total} doğru`;
}

function notFound() {
  setAppAccent(null);
  mount(`<div class="empty"><div class="big">📭</div><h2>Ders bulunamadı</h2>
    <p><a href="#/" style="color:var(--accent)">Ana sayfaya dön</a>.</p></div>`);
}
