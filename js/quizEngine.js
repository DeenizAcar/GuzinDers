/* ============================================================================
   quizEngine.js — Pure, framework-free grading logic for the quiz engine.

   Knows how to grade each of the four supported question types:
     • multiple_choice — exact match against the resolved correct option text
     • true_false      — "Doğru" / "Yanlış"
     • fill_blank      — answer + any `acceptable` alternatives, fuzzily matched
     • open_ended      — cannot be auto-graded here; flagged needsManual so the
                         view can either ask the LLM (gradeOpenEnded) or let the
                         learner self-assess.

   All comparisons go through fold(): a Turkish-aware normaliser that lowercases,
   removes diacritics/İ-ı quirks, strips punctuation and collapses whitespace so
   "Doğru.", "dogru" and "DOĞRU" all match.
   ========================================================================== */

/* Turkish-aware normalisation for forgiving string comparison. */
export function fold(s) {
  return String(s ?? "")
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i").replace(/İ/g, "i").replace(/i̇/g, "i")
    .replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u")
    .replace(/ö/g, "o").replace(/ç/g, "c")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // strip any leftover accents
    .replace(/[^\p{L}\p{N}\s]/gu, " ")                // punctuation -> space
    .replace(/\s+/g, " ")
    .trim();
}

/* True if two strings are equal after folding. */
function eq(a, b) { return fold(a) === fold(b); }

/* ----------------------------------------------------------- Per-type grading */

function gradeMultipleChoice(q, answer) {
  return eq(answer, q.answer);
}

function gradeTrueFalse(q, answer) {
  // Normalise common truthy spellings to the canonical Turkish labels.
  const norm = (v) => {
    const f = fold(v);
    if (["dogru", "d", "true", "t", "evet", "yes"].includes(f)) return "dogru";
    if (["yanlis", "y", "false", "f", "hayir", "no"].includes(f)) return "yanlis";
    return f;
  };
  return norm(answer) === norm(q.answer);
}

function gradeFillBlank(q, answer) {
  const user = fold(answer);
  if (!user) return false;
  const candidates = [q.answer, ...(q.acceptable || [])].map(fold).filter(Boolean);
  // Exact (folded) match against any accepted answer …
  if (candidates.includes(user)) return true;
  // … or the user typed extra words but the key answer appears as a whole token.
  return candidates.some((c) => {
    if (!c) return false;
    const re = new RegExp(`(^|\\s)${c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`);
    return re.test(user);
  });
}

/* ------------------------------------------------------------- Public grading */

/* Grade a single question against the learner's answer.
   Returns { correct: boolean|null, needsManual: boolean }.
   open_ended always returns { correct: null, needsManual: true }. */
export function gradeQuestion(q, answer) {
  switch (q.type) {
    case "multiple_choice": return { correct: gradeMultipleChoice(q, answer), needsManual: false };
    case "true_false":      return { correct: gradeTrueFalse(q, answer), needsManual: false };
    case "fill_blank":      return { correct: gradeFillBlank(q, answer), needsManual: false };
    case "open_ended":      return { correct: null, needsManual: true };
    default:                return { correct: false, needsManual: false };
  }
}

/* Lightweight offline heuristic for open-ended answers when no API key is set:
   keyword overlap between the learner's answer and the model answer. It is only
   a hint — the UI still lets the learner override via self-grading. */
export function heuristicOpenEnded(modelAnswer, userAnswer) {
  const stop = new Set(["ve", "ile", "bir", "bu", "da", "de", "ki", "için", "olarak", "olan", "the", "a", "an"]);
  const toks = (s) => fold(s).split(" ").filter((w) => w.length > 2 && !stop.has(w));
  const key = toks(modelAnswer);
  const usr = new Set(toks(userAnswer));
  if (!key.length || !usr.size) return { score: 0, correct: false };
  const hit = key.filter((w) => usr.has(w)).length;
  const score = hit / key.length;
  return { score, correct: score >= 0.4 };
}

/* Aggregate per-question results into a summary used for the results screen
   and Progress logging. `results` = [{ q, correct }]. */
export function summarize(results) {
  const total = results.length;
  const correctCount = results.filter((r) => r.correct === true).length;
  const score = total ? Math.round((correctCount / total) * 100) : 0;
  // Topics the learner missed — feeds weak-area tracking & next-quiz biasing.
  const missedTopics = [
    ...new Set(
      results.filter((r) => r.correct === false && r.q.topicTitle).map((r) => r.q.topicTitle)
    ),
  ];
  return { total, correctCount, score, missedTopics };
}
