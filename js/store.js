/* ============================================================================
   store.js — Local persistence layer (localStorage)
   Everything Deniz creates lives in the browser: API settings, personal notes,
   reading progress and quiz history. No server, no account, fully private.
   Each concern is namespaced under a single key and read/written as JSON.
   ========================================================================== */

const KEYS = {
  settings: "guzin.settings.v1",
  notes: "guzin.notes.v1",
  progress: "guzin.progress.v1",
};

/* Safe JSON read with a default fallback (handles missing/corrupt data). */
function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : structuredCloneSafe(fallback);
  } catch (err) {
    console.warn("store: read failed for", key, err);
    return structuredCloneSafe(fallback);
  }
}

/* Safe JSON write. Returns true on success. */
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn("store: write failed for", key, err);
    return false;
  }
}

/* structuredClone is not everywhere; fall back to JSON clone for plain data. */
function structuredCloneSafe(v) {
  try { return structuredClone(v); }
  catch { return JSON.parse(JSON.stringify(v)); }
}

/* ----------------------------------------------------------------- Settings */
const DEFAULT_SETTINGS = {
  provider: "anthropic",                 // "anthropic" | "openai"
  apiKey: "",
  model: "",                             // empty => provider default (see llm.js)
  difficulty: "orta",                    // "kolay" | "orta" | "zor"
  questionCount: 6,
  autoNext: true,                        // auto-generate the next quiz when one ends
  enabledTypes: ["multiple_choice", "true_false", "fill_blank", "open_ended"],
  theme: "light",                        // "light" | "dark"
};

export const Settings = {
  get() {
    return { ...DEFAULT_SETTINGS, ...read(KEYS.settings, {}) };
  },
  set(patch) {
    const next = { ...this.get(), ...patch };
    write(KEYS.settings, next);
    return next;
  },
  hasKey() {
    return !!this.get().apiKey.trim();
  },
};

/* -------------------------------------------------------------------- Notes */
/* Notes are keyed per topic as `${courseId}::${topicId}`; "" key = scratchpad. */
export const Notes = {
  all() { return read(KEYS.notes, {}); },
  key(courseId, topicId) { return `${courseId || "_"}::${topicId || "_"}`; },
  get(courseId, topicId) { return this.all()[this.key(courseId, topicId)] || ""; },
  set(courseId, topicId, text) {
    const all = this.all();
    const k = this.key(courseId, topicId);
    if (text && text.trim()) all[k] = text; else delete all[k];
    write(KEYS.notes, all);
  },
  count() { return Object.keys(this.all()).length; },
};

/* ----------------------------------------------------------------- Progress */
/* progress = { read: { "courseId::topicId": ISODate }, quizzes: [ {...} ] } */
export const Progress = {
  _data() { return read(KEYS.progress, { read: {}, quizzes: [] }); },
  _save(d) { write(KEYS.progress, d); },

  markRead(courseId, topicId, value = true) {
    const d = this._data();
    const k = `${courseId}::${topicId}`;
    if (value) d.read[k] = new Date().toISOString();
    else delete d.read[k];
    this._save(d);
  },
  isRead(courseId, topicId) {
    return !!this._data().read[`${courseId}::${topicId}`];
  },
  readCountFor(courseId) {
    return Object.keys(this._data().read).filter((k) => k.startsWith(courseId + "::")).length;
  },

  logQuiz(entry) {
    const d = this._data();
    d.quizzes.unshift({ ...entry, date: new Date().toISOString() });
    d.quizzes = d.quizzes.slice(0, 200);     // keep history bounded
    this._save(d);
  },
  quizzes() { return this._data().quizzes; },
  quizzesFor(courseId) { return this.quizzes().filter((q) => q.courseId === courseId); },

  /* Topics the learner most often gets wrong — used to bias new quiz generation. */
  weakTopics(courseId, limit = 3) {
    const tally = {};
    for (const q of this.quizzesFor(courseId)) {
      for (const t of q.missedTopics || []) {
        tally[t] = (tally[t] || 0) + 1;
      }
    }
    return Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([t]) => t);
  },
};

/* ------------------------------------------------- Whole-store export/clear */
export const StoreAdmin = {
  exportAll() {
    return {
      settings: Settings.get(),
      notes: Notes.all(),
      progress: Progress._data(),
      exportedAt: new Date().toISOString(),
    };
  },
  importAll(obj) {
    if (obj.settings) write(KEYS.settings, obj.settings);
    if (obj.notes) write(KEYS.notes, obj.notes);
    if (obj.progress) write(KEYS.progress, obj.progress);
  },
  clearAll() {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
  },
};
