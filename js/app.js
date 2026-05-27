/* ============================================================================
   app.js — Application bootstrap.
   Loads course data for the nav, applies the saved theme, wires the hash router
   to each view, keeps the top navigation + API status pill in sync, and starts
   the app. This is the only script the page loads (type="module"); everything
   else is imported from here.
   ========================================================================== */

import { COURSES } from "../data/index.js";
import { Settings } from "./store.js";
import { Router } from "./router.js";
import { updateApiPill, escapeHtml } from "./ui.js";

import * as dashboard from "./views/dashboard.js";
import * as study from "./views/study.js";
import * as quiz from "./views/quiz.js";
import * as settings from "./views/settings.js";

/* ------------------------------------------------------------------ Theme -- */
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme === "dark" ? "dark" : "light";
}

function initTheme() {
  applyTheme(Settings.get().theme);
  const btn = document.getElementById("themeToggle");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const next = (Settings.get().theme === "dark") ? "light" : "dark";
    Settings.set({ theme: next });
    applyTheme(next);
  });
}

/* --------------------------------------------------------------- Top nav --- */
function buildNav() {
  const nav = document.getElementById("topnav");
  if (!nav) return;
  nav.innerHTML = COURSES.map((c) =>
    `<a href="#/course/${encodeURIComponent(c.id)}" data-course="${escapeHtml(c.id)}">${escapeHtml(c.icon || "")} ${escapeHtml(c.title)}</a>`
  ).join("");
}

/* Highlight the nav entry matching the current route. */
function highlightNav() {
  const hash = window.location.hash.replace(/^#/, "");
  document.querySelectorAll("#topnav a").forEach((a) => {
    const id = a.dataset.course;
    const active = hash.includes(`/${id}/`) || hash === `/course/${id}` || hash.startsWith(`/course/${id}`) || hash.startsWith(`/quiz/${id}`) || hash.startsWith(`/study/${id}`);
    a.classList.toggle("active", !!active);
  });
}

/* --------------------------------------------------------------- Routes ---- */
function initRouter() {
  const router = new Router();

  const ctx = (params, query) => ({ params, query, router });

  router
    .on("/", () => dashboard.render(ctx({}, {})))
    .on("/course/:courseId", (p, q) => study.render(ctx(p, q)))
    .on("/study/:courseId/:topicId", (p, q) => study.render(ctx(p, q)))
    .on("/quiz/:courseId", (p, q) => quiz.render(ctx(p, q)))
    .on("/quiz/:courseId/:topicId", (p, q) => quiz.render(ctx(p, q)))
    .on("/settings", () => settings.render())
    .setNotFound(() => dashboard.render(ctx({}, {})));

  // Keep nav highlight in sync with every navigation.
  window.addEventListener("hashchange", highlightNav);

  router.start();
  highlightNav();
}

/* ---------------------------------------------------------------- Boot ----- */
function boot() {
  initTheme();
  buildNav();
  updateApiPill();
  initRouter();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
