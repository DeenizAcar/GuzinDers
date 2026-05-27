/* ============================================================================
   ui.js — Shared DOM, escaping and feedback helpers used by every view.
   Kept in its own module so views and app.js can both import it without
   creating a circular dependency (app.js imports views; views need toast()).
   ========================================================================== */

import { Settings } from "./store.js";

/* Query helpers. */
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* Reflect LLM connection state in the footer pill. Called on boot and whenever
   settings change. */
export function updateApiPill() {
  const pill = document.getElementById("apiStatus");
  if (!pill) return;
  const has = Settings.hasKey();
  const prov = Settings.get().provider === "openai" ? "OpenAI" : "Anthropic";
  pill.classList.toggle("on", has);
  pill.classList.toggle("off", !has);
  pill.textContent = has ? `${prov} bağlı` : "API anahtarı yok";
}

/* HTML-escape any value before interpolating it into a template string.
   renderMarkdown() already escapes its own input; use this for everything else
   (quiz text, titles, user-derived strings). */
export function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* Render an HTML string into the #app mount and return the mount node. */
export function mount(html) {
  const app = document.getElementById("app");
  app.innerHTML = html;
  return app;
}

/* Scope a course accent color (--accent) to the #app subtree, or clear it. */
export function setAppAccent(accent) {
  const app = document.getElementById("app");
  if (!app) return;
  if (accent) app.style.setProperty("--accent", accent);
  else app.style.removeProperty("--accent");
}

/* Transient toast notification. kind: "" (default/ink) | "err". */
export function toast(message, kind = "") {
  const wrap = document.getElementById("toasts");
  if (!wrap) { console.log("toast:", message); return; }
  const t = document.createElement("div");
  t.className = "toast" + (kind ? " " + kind : "");
  t.textContent = message;
  wrap.appendChild(t);
  setTimeout(() => {
    t.style.transition = "opacity .3s, transform .3s";
    t.style.opacity = "0";
    t.style.transform = "translateY(8px)";
    setTimeout(() => t.remove(), 320);
  }, 2600);
}

/* Debounce a function — used for note autosave. */
export function debounce(fn, ms = 500) {
  let id = null;
  return (...args) => {
    clearTimeout(id);
    id = setTimeout(() => fn(...args), ms);
  };
}

/* Format an ISO date as a short, locale-friendly Turkish string. */
export function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString("tr-TR", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    });
  } catch { return ""; }
}

/* Human label for a quiz question type. */
export const TYPE_LABELS = {
  multiple_choice: "Çoktan Seçmeli",
  true_false: "Doğru / Yanlış",
  fill_blank: "Boşluk Doldurma",
  open_ended: "Klasik / Açık Uçlu",
};
