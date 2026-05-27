/* ============================================================================
   router.js — Tiny hash-based router for a no-build static SPA.
   Routes are declared as patterns with :params, e.g. "/study/:courseId/:topicId".
   Hash routing keeps the app working on GitHub Pages with zero server config
   and supports deep links / browser back-forward out of the box.
   ========================================================================== */

export class Router {
  constructor() {
    this.routes = [];
    this.notFound = null;
    window.addEventListener("hashchange", () => this._resolve());
  }

  /* Register a route. handler receives (params, query). */
  on(pattern, handler) {
    const keys = [];
    const rx = new RegExp(
      "^" +
        pattern.replace(/:[^/]+/g, (m) => { keys.push(m.slice(1)); return "([^/]+)"; }) +
        "/?$"
    );
    this.routes.push({ rx, keys, handler });
    return this;
  }

  setNotFound(handler) { this.notFound = handler; return this; }

  /* Programmatic navigation. */
  go(path) { window.location.hash = path.startsWith("#") ? path : "#" + path; }

  start() { this._resolve(); }

  _resolve() {
    const raw = window.location.hash.replace(/^#/, "") || "/";
    const [path, queryStr] = raw.split("?");
    const query = Object.fromEntries(new URLSearchParams(queryStr || ""));

    for (const r of this.routes) {
      const m = path.match(r.rx);
      if (m) {
        const params = {};
        r.keys.forEach((k, idx) => (params[k] = decodeURIComponent(m[idx + 1])));
        window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
        return r.handler(params, query);
      }
    }
    if (this.notFound) this.notFound();
  }
}
