/* ============================================================================
   views/settings.js — Configuration: LLM provider + API key, study preferences
   and local data management. Everything is saved to localStorage via store.js
   the moment it changes; nothing leaves the browser except calls to the LLM
   provider the learner chose.
   ========================================================================== */

import { Settings, StoreAdmin } from "../store.js";
import { providerInfo, defaultModel, testConnection } from "../llm.js";
import { mount, setAppAccent, escapeHtml, toast, updateApiPill, TYPE_LABELS } from "../ui.js";

const DIFFS = [["kolay", "Kolay"], ["orta", "Orta"], ["zor", "Zor"]];
const COUNTS = [4, 6, 8, 10, 12];
const TYPES = ["multiple_choice", "true_false", "fill_blank", "open_ended"];

function modelOptions(provider, current) {
  const info = providerInfo(provider);
  const opts = [`<option value="">Varsayılan (${escapeHtml(info.defaultModel)})</option>`];
  for (const m of info.models) {
    opts.push(`<option value="${escapeHtml(m)}"${m === current ? " selected" : ""}>${escapeHtml(m)}</option>`);
  }
  return opts.join("");
}

export function render() {
  setAppAccent(null);
  const s = Settings.get();

  mount(`
    <section class="page-head reveal">
      <span class="eyebrow">Ayarlar</span>
      <h1 class="page-title">Ayarlar</h1>
      <p class="page-sub">Yapay zeka sağlayıcını, anahtarını ve çalışma tercihlerini buradan yönet.
      Tüm veriler yalnızca bu tarayıcıda saklanır.</p>
    </section>

    <!-- LLM provider -->
    <div class="panel reveal" style="--d:60ms">
      <h2>Yapay Zeka Bağlantısı</h2>
      <p class="hint">Sınırsız quiz üretimi için bir sağlayıcı seç ve kişisel API anahtarını gir.</p>

      <div class="field">
        <label>Sağlayıcı</label>
        <div class="seg" id="providerSeg">
          <button data-provider="anthropic" class="${s.provider === "anthropic" ? "on" : ""}">Anthropic (Claude)</button>
          <button data-provider="openai" class="${s.provider === "openai" ? "on" : ""}">OpenAI (GPT)</button>
        </div>
      </div>

      <div class="field">
        <label for="apiKey">API Anahtarı</label>
        <div class="input-row">
          <input class="input" id="apiKey" type="password" autocomplete="off" spellcheck="false"
            placeholder="${s.provider === "openai" ? "sk-..." : "sk-ant-..."}" value="${escapeHtml(s.apiKey)}" />
          <button class="btn btn--ghost" id="toggleKey" title="Göster/Gizle">👁</button>
        </div>
        <div class="desc">Anahtar yalnızca tarayıcının localStorage'ında tutulur, hiçbir sunucuya gönderilmez.</div>
      </div>

      <div class="field">
        <label for="model">Model</label>
        <select class="input" id="model">${modelOptions(s.provider, s.model)}</select>
      </div>

      <div class="btn-row">
        <button class="btn btn--primary" id="testBtn">Bağlantıyı test et</button>
        <span id="testResult" style="align-self:center;font-weight:600;font-size:13.5px;color:var(--muted)"></span>
      </div>
    </div>

    <!-- Study preferences -->
    <div class="panel reveal" style="--d:120ms">
      <h2>Quiz Tercihleri</h2>
      <p class="hint">Üretilecek quizlerin zorluğunu, soru sayısını ve türlerini belirle.</p>

      <div class="field">
        <label>Zorluk</label>
        <div class="seg" id="diffSeg">
          ${DIFFS.map(([v, l]) => `<button data-diff="${v}" class="${s.difficulty === v ? "on" : ""}">${l}</button>`).join("")}
        </div>
      </div>

      <div class="field">
        <label>Soru sayısı</label>
        <div class="seg" id="countSeg">
          ${COUNTS.map((n) => `<button data-count="${n}" class="${s.questionCount === n ? "on" : ""}">${n}</button>`).join("")}
        </div>
      </div>

      <div class="field">
        <label>Soru türleri</label>
        <div class="types-grid" id="typesGrid">
          ${TYPES.map((t) => `
            <label class="typetile ${s.enabledTypes.includes(t) ? "on" : ""}">
              <input type="checkbox" data-type="${t}" ${s.enabledTypes.includes(t) ? "checked" : ""} />
              <span>${escapeHtml(TYPE_LABELS[t])}</span>
            </label>`).join("")}
        </div>
        <div class="desc">En az bir tür seçili olmalı.</div>
      </div>

      <div class="field">
        <label class="typetile ${s.autoNext ? "on" : ""}" style="max-width:380px" id="autoNextTile">
          <input type="checkbox" id="autoNext" ${s.autoNext ? "checked" : ""} />
          <span>Quiz bitince otomatik olarak yeni quiz üret</span>
        </label>
      </div>
    </div>

    <!-- Data management -->
    <div class="panel reveal" style="--d:180ms">
      <h2>Veriler</h2>
      <p class="hint">Notların, ilerlemen ve ayarların bu cihazda saklanır. Yedekle veya temizle.</p>
      <div class="btn-row">
        <button class="btn btn--ghost" id="exportBtn">⬇ Verileri dışa aktar (JSON)</button>
        <label class="btn btn--ghost" style="cursor:pointer">⬆ İçe aktar
          <input type="file" id="importFile" accept="application/json" style="display:none" />
        </label>
        <button class="btn btn--ghost" id="clearBtn" style="color:var(--bad)">🗑 Tümünü temizle</button>
      </div>
    </div>
  `);

  wire();
}

function wire() {
  // Provider segment → re-render model list + key placeholder.
  document.getElementById("providerSeg").querySelectorAll("button").forEach((b) => {
    b.addEventListener("click", () => {
      Settings.set({ provider: b.dataset.provider, model: "" });
      updateApiPill();
      render(); // simplest: re-render with new provider context
    });
  });

  // API key
  const keyInput = document.getElementById("apiKey");
  keyInput.addEventListener("input", () => {
    Settings.set({ apiKey: keyInput.value.trim() });
    updateApiPill();
  });
  document.getElementById("toggleKey").addEventListener("click", () => {
    keyInput.type = keyInput.type === "password" ? "text" : "password";
  });

  // Model
  document.getElementById("model").addEventListener("change", (e) => {
    Settings.set({ model: e.target.value });
  });

  // Test connection
  const testBtn = document.getElementById("testBtn");
  const testResult = document.getElementById("testResult");
  testBtn.addEventListener("click", async () => {
    if (!Settings.hasKey()) { testResult.style.color = "var(--bad)"; testResult.textContent = "Önce bir anahtar gir."; return; }
    testBtn.disabled = true; testBtn.textContent = "Test ediliyor…";
    testResult.style.color = "var(--muted)"; testResult.textContent = "";
    const res = await testConnection(Settings.get());
    testResult.style.color = res.ok ? "var(--good)" : "var(--bad)";
    testResult.textContent = res.message;
    testBtn.disabled = false; testBtn.textContent = "Bağlantıyı test et";
    toast(res.ok ? "Bağlantı başarılı ✓" : "Bağlantı hatası", res.ok ? "" : "err");
  });

  // Difficulty
  document.getElementById("diffSeg").querySelectorAll("button").forEach((b) => {
    b.addEventListener("click", () => {
      Settings.set({ difficulty: b.dataset.diff });
      document.querySelectorAll("#diffSeg button").forEach((x) => x.classList.toggle("on", x === b));
    });
  });

  // Question count
  document.getElementById("countSeg").querySelectorAll("button").forEach((b) => {
    b.addEventListener("click", () => {
      Settings.set({ questionCount: Number(b.dataset.count) });
      document.querySelectorAll("#countSeg button").forEach((x) => x.classList.toggle("on", x === b));
    });
  });

  // Question types
  document.getElementById("typesGrid").querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener("change", () => {
      const enabled = [...document.querySelectorAll('#typesGrid input:checked')].map((x) => x.dataset.type);
      if (!enabled.length) { cb.checked = true; toast("En az bir tür seçili olmalı.", "err"); return; }
      Settings.set({ enabledTypes: enabled });
      cb.closest(".typetile").classList.toggle("on", cb.checked);
    });
  });

  // Auto-next
  const autoNext = document.getElementById("autoNext");
  autoNext.addEventListener("change", () => {
    Settings.set({ autoNext: autoNext.checked });
    document.getElementById("autoNextTile").classList.toggle("on", autoNext.checked);
  });

  // Export
  document.getElementById("exportBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(StoreAdmin.exportAll(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `guzin-ders-yedek-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Veriler indirildi.");
  });

  // Import
  document.getElementById("importFile").addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        StoreAdmin.importAll(JSON.parse(reader.result));
        toast("Veriler içe aktarıldı.");
        updateApiPill();
        render();
      } catch (err) {
        toast("Geçersiz yedek dosyası.", "err");
      }
    };
    reader.readAsText(file);
  });

  // Clear all
  document.getElementById("clearBtn").addEventListener("click", () => {
    if (!confirm("Tüm notların, ilerlemen ve ayarların silinecek. Emin misin?")) return;
    StoreAdmin.clearAll();
    updateApiPill();
    toast("Tüm veriler temizlendi.");
    render();
  });
}
