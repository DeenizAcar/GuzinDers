/* ============================================================================
   views/dashboard.js — The home hub.
   Shows a greeting + overall study stats, a "continue where you left off" hint,
   and a responsive grid of course cards (each with its own accent + progress).
   Everything is data-driven from data/index.js, so new courses appear here
   automatically with zero changes to this file.
   ========================================================================== */

import { COURSES, totalTopics } from "../../data/index.js";
import { Progress, Notes } from "../store.js";
import { mount, setAppAccent, escapeHtml } from "../ui.js";

/* Sum reading progress across every course. */
function readStats() {
  let read = 0;
  for (const c of COURSES) read += Progress.readCountFor(c.id);
  return read;
}

/* Estimated total study minutes for a course. */
function courseMinutes(c) {
  return c.topics.reduce((n, t) => n + (t.estMinutes || 0), 0);
}

function courseCard(c, idx) {
  const total = c.topics.length;
  const read = Progress.readCountFor(c.id);
  const pct = total ? Math.round((read / total) * 100) : 0;
  const mins = courseMinutes(c);
  return `
    <article class="course-card reveal" style="--accent:${escapeHtml(c.accent)};--d:${idx * 60}ms">
      <a class="course-card__top" href="#/course/${encodeURIComponent(c.id)}" aria-label="${escapeHtml(c.title)} dersini aç">
        <span class="course-card__icon">${escapeHtml(c.icon || "📘")}</span>
        <span>
          <h3>${escapeHtml(c.title)}</h3>
          <span class="course-card__meta">${total} konu · ~${mins} dk</span>
        </span>
      </a>
      <p>${escapeHtml(c.description || c.subtitle || "")}</p>
      <div class="course-card__foot">
        <div class="progress" title="${read}/${total} konu okundu"><i style="width:${pct}%"></i></div>
        <span class="progress-label">${pct}%</span>
      </div>
      <div class="btn-row">
        <a class="btn btn--primary btn--sm" href="#/course/${encodeURIComponent(c.id)}">Çalış</a>
        <a class="btn btn--ghost btn--sm" href="#/quiz/${encodeURIComponent(c.id)}">Quiz başlat</a>
      </div>
    </article>`;
}

/* "Continue where you left off" — derived from the most recent quiz, if any. */
function continueBanner() {
  const last = Progress.quizzes()[0];
  if (!last) return "";
  const c = COURSES.find((x) => x.id === last.courseId);
  if (!c) return "";
  const target = last.topicId
    ? `#/study/${encodeURIComponent(c.id)}/${encodeURIComponent(last.topicId)}`
    : `#/course/${encodeURIComponent(c.id)}`;
  return `
    <a class="note-banner reveal" href="${target}" style="--accent:${escapeHtml(c.accent)};text-decoration:none">
      <span style="font-size:20px">↩️</span>
      <span><b>Kaldığın yerden devam et:</b> ${escapeHtml(c.title)} — son quiz skorun
      <b>%${last.score ?? 0}</b>. Çalışmaya geri dön →</span>
    </a>`;
}

export function render() {
  setAppAccent(null); // dashboard uses the global/theme accent

  const stats = [
    { num: COURSES.length, label: "Ders" },
    { num: totalTopics(), label: "Konu" },
    { num: readStats(), label: "Okunan konu" },
    { num: Progress.quizzes().length, label: "Çözülen quiz" },
  ];

  mount(`
    <section class="page-head reveal">
      <span class="eyebrow">Çalışma Masası</span>
      <h1 class="page-title">Merhaba Deniz 👋</h1>
      <p class="page-sub">Final hazırlığın için tüm derslerin, çalışma kartların ve
      sınırsız quiz üreticin tek yerde. Bir ders seç ve çalışmaya başla.</p>
    </section>

    <section class="hero">
      <div class="hero__panel reveal" style="--d:80ms">
        <h1>Okumadan önce, anlamak için çalış.</h1>
        <p>Ders notlarını çalışma kartlarına böl, kendi notlarını al ve her quiz
        bittiğinde performansına göre <b>otomatik üretilen yeni bir quiz</b> ile
        pratiğe devam et.</p>
        <div class="btn-row" style="margin-top:18px">
          <a class="btn btn--primary" href="#/course/${encodeURIComponent(COURSES[0]?.id || "")}">Çalışmaya başla</a>
          <a class="btn btn--ghost" href="#/settings">API anahtarını ayarla</a>
        </div>
      </div>
      <div class="stat-grid">
        ${stats.map((s, i) => `
          <div class="stat reveal" style="--d:${120 + i * 60}ms">
            <div class="stat__num">${s.num}</div>
            <div class="stat__label">${s.label}</div>
          </div>`).join("")}
      </div>
    </section>

    ${continueBanner()}

    <h2 class="section-title reveal">Dersler</h2>
    <section class="course-grid">
      ${COURSES.map((c, i) => courseCard(c, i)).join("")}
    </section>

    ${Notes.count() ? `<p class="page-sub" style="margin-top:26px">📝 Şu ana kadar ${Notes.count()} konuda not aldın.</p>` : ""}
  `);
}
