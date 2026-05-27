/* ============================================================================
   data/index.js — Course registry.

   ▸ HOW TO ADD A NEW COURSE LATER (the whole point of this file):
     1. Create  data/courses/<id>.js  exporting a default object shaped like:
          export default {
            id: "biyoloji",
            title: "Biyoloji",
            subtitle: "Hücre ve Genetik",
            icon: "🧬",
            accent: "#3b7a57",          // any CSS color — used for theming
            description: "Kısa açıklama…",
            topics: [
              { id: "hucre", title: "Hücre", estMinutes: 20, markdown: "### Hücre\n\n…" }
            ]
          }
        Use `---` lines inside `markdown` to break a topic into study cards.
     2. Import it below and add it to the COURSES array. That's it — the
        dashboard, study view, notes and quiz engine all pick it up automatically.
     3. (Optional) add seed quiz questions in data/seeds.js for offline practice.
   ========================================================================== */

import inkilap from "./courses/inkilap.js";
import edebiyat from "./courses/edebiyat.js";
import analog from "./courses/analog.js";
import alternatif from "./courses/alternatif.js";
import sayisal from "./courses/sayisal.js";

/* Order here = order shown across the app. */
export const COURSES = [inkilap, edebiyat, analog, alternatif, sayisal];

export function getCourse(courseId) {
  return COURSES.find((c) => c.id === courseId) || null;
}

export function getTopic(courseId, topicId) {
  const c = getCourse(courseId);
  if (!c) return null;
  return c.topics.find((t) => t.id === topicId) || null;
}

export function firstTopic(courseId) {
  const c = getCourse(courseId);
  return c && c.topics.length ? c.topics[0] : null;
}

export function totalTopics() {
  return COURSES.reduce((n, c) => n + c.topics.length, 0);
}
