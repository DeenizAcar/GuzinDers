/* ============================================================================
   views/study.js — Reading + note-taking workspace for a single topic.

   Layout: sticky table-of-contents (all topics in the course, with read dots)
   beside a reader that toggles between "study cards" (each slide/page collapsed
   into a card) and "full text". A slide-in notebook panel autosaves personal
   notes per topic to localStorage. A button starts a quiz on the topic.
   ========================================================================== */

import { getCourse, getTopic, firstTopic } from "../../data/index.js";
import { Progress, Notes } from "../store.js";
import { renderMarkdown, splitCards } from "../markdown.js";
import { mount, setAppAccent, escapeHtml, toast, debounce } from "../ui.js";

/* Persisted across navigations within a session. */
let viewMode = "card"; // "card" | "full"

/* Build the table-of-contents sidebar. */
function tocHtml(course, activeId) {
  const items = course.topics.map((t) => {
    const done = Progress.isRead(course.id, t.id);
    const active = t.id === activeId;
    return `
      <a href="#/study/${encodeURIComponent(course.id)}/${encodeURIComponent(t.id)}"
         class="${active ? "active " : ""}${done ? "done" : ""}" data-topic="${escapeHtml(t.id)}">
        <span class="toc__dot"></span>
        <span>${escapeHtml(t.title)}</span>
        <span class="toc__min">${t.estMinutes || 0}dk</span>
      </a>`;
  }).join("");
  return `
    <aside class="toc">
      <div class="toc__head">${escapeHtml(course.title)}</div>
      ${items}
    </aside>`;
}

/* Card view — each slide/page becomes a collapsible study card. */
function cardsHtml(topic) {
  const cards = splitCards(topic.markdown);
  if (!cards.length) return `<div class="empty">Bu konuda içerik bulunamadı.</div>`;
  return `<div class="cards">` + cards.map((card, i) => `
    <section class="scard${i === 0 ? " open" : ""}">
      <header class="scard__head">
        <span class="scard__no">${String(i + 1).padStart(2, "0")}</span>
        <span class="scard__title">${escapeHtml(card.title)}</span>
        <span class="scard__chev">›</span>
      </header>
      <div class="scard__body"><div class="prose">${card.html}</div></div>
    </section>`).join("") + `</div>`;
}

/* Full-text view — the whole topic rendered as one flowing document. */
function fullHtml(topic) {
  return `<div class="prose">${renderMarkdown(topic.markdown)}</div>`;
}

export function render({ params, router }) {
  const course = getCourse(params.courseId);
  if (!course) { notFound(); return; }

  // #/course/:id (no topic) → open the first topic.
  let topic = params.topicId ? getTopic(course.id, params.topicId) : null;
  if (!topic) {
    const first = firstTopic(course.id);
    if (first) { router.go(`/study/${course.id}/${first.id}`); return; }
    notFound(); return;
  }

  setAppAccent(course.accent);
  const isRead = Progress.isRead(course.id, topic.id);

  mount(`
    <nav class="crumbs reveal">
      <a href="#/">Ana sayfa</a><span>›</span>
      <a href="#/course/${encodeURIComponent(course.id)}">${escapeHtml(course.title)}</a><span>›</span>
      <span>${escapeHtml(topic.title)}</span>
    </nav>

    <div class="study reveal" style="--d:60ms">
      ${tocHtml(course, topic.id)}

      <section class="reader">
        <div class="reader__bar">
          <h2>${escapeHtml(topic.title)}</h2>
          <div class="viewtoggle" role="tablist" aria-label="Görünüm">
            <button data-mode="card" class="${viewMode === "card" ? "on" : ""}">Kartlar</button>
            <button data-mode="full" class="${viewMode === "full" ? "on" : ""}">Tam metin</button>
          </div>
        </div>

        <div class="btn-row" style="margin-bottom:20px">
          <button class="btn btn--primary btn--sm" id="startQuiz">📝 Bu konudan quiz</button>
          <button class="btn btn--ghost btn--sm" id="markRead">${isRead ? "✓ Okundu" : "Okundu olarak işaretle"}</button>
        </div>

        <div id="readerBody">${viewMode === "card" ? cardsHtml(topic) : fullHtml(topic)}</div>
      </section>
    </div>

    <!-- Notebook -->
    <button class="note-fab" id="noteFab">📝 Notlar</button>
    <div class="backdrop" id="noteBackdrop"></div>
    <section class="notebook" id="notebook" aria-hidden="true">
      <header class="notebook__head">
        <h3>Notlarım</h3>
        <button class="iconbtn" id="noteClose" title="Kapat" aria-label="Kapat">✕</button>
      </header>
      <div class="notebook__sub">${escapeHtml(course.title)} · ${escapeHtml(topic.title)}</div>
      <textarea id="noteArea" placeholder="Bu konuyla ilgili kendi notlarını buraya yaz… Otomatik kaydedilir."></textarea>
      <footer class="notebook__foot">
        <span class="saved-dot" id="savedDot" style="opacity:.25"></span>
        <span id="savedText">Yazmaya başla — değişiklikler otomatik kaydedilir.</span>
      </footer>
    </section>
  `);

  wire(course, topic, router);
}

/* Attach all event listeners after the markup is in the DOM. */
function wire(course, topic, router) {
  // View mode toggle
  document.querySelectorAll(".viewtoggle button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.mode;
      if (mode === viewMode) return;
      viewMode = mode;
      document.querySelectorAll(".viewtoggle button").forEach((b) =>
        b.classList.toggle("on", b.dataset.mode === viewMode));
      document.getElementById("readerBody").innerHTML =
        viewMode === "card" ? cardsHtml(topic) : fullHtml(topic);
      bindCards();
    });
  });
  bindCards();

  // Start quiz on this topic
  document.getElementById("startQuiz").addEventListener("click", () => {
    router.go(`/quiz/${course.id}/${topic.id}`);
  });

  // Mark read toggle (updates button + TOC dot in place)
  const markBtn = document.getElementById("markRead");
  markBtn.addEventListener("click", () => {
    const now = !Progress.isRead(course.id, topic.id);
    Progress.markRead(course.id, topic.id, now);
    markBtn.textContent = now ? "✓ Okundu" : "Okundu olarak işaretle";
    const tocLink = document.querySelector(`.toc a[data-topic="${CSS.escape(topic.id)}"]`);
    if (tocLink) tocLink.classList.toggle("done", now);
    toast(now ? "Konu okundu olarak işaretlendi." : "İşaret kaldırıldı.");
  });

  // Notebook open/close
  const nb = document.getElementById("notebook");
  const backdrop = document.getElementById("noteBackdrop");
  const area = document.getElementById("noteArea");
  const open = () => { nb.classList.add("open"); backdrop.classList.add("show"); nb.setAttribute("aria-hidden", "false"); area.focus(); };
  const close = () => { nb.classList.remove("open"); backdrop.classList.remove("show"); nb.setAttribute("aria-hidden", "true"); };
  document.getElementById("noteFab").addEventListener("click", open);
  document.getElementById("noteClose").addEventListener("click", close);
  backdrop.addEventListener("click", close);
  document.addEventListener("keydown", function esc(e) {
    if (e.key === "Escape" && nb.classList.contains("open")) close();
  });

  // Notebook content + autosave
  area.value = Notes.get(course.id, topic.id);
  const dot = document.getElementById("savedDot");
  const txt = document.getElementById("savedText");
  const save = debounce((val) => {
    Notes.set(course.id, topic.id, val);
    dot.style.opacity = "1";
    txt.textContent = "Otomatik kaydedildi ✓";
  }, 450);
  area.addEventListener("input", () => {
    dot.style.opacity = ".25";
    txt.textContent = "Kaydediliyor…";
    save(area.value);
  });
}

/* Make study cards collapsible (event delegation re-bound after re-render). */
function bindCards() {
  document.querySelectorAll(".scard__head").forEach((head) => {
    head.addEventListener("click", () => head.parentElement.classList.toggle("open"));
  });
}

function notFound() {
  setAppAccent(null);
  mount(`<div class="empty"><div class="big">📭</div><h2>Ders bulunamadı</h2>
    <p>Aradığın içerik mevcut değil. <a href="#/" style="color:var(--accent)">Ana sayfaya dön</a>.</p></div>`);
}
