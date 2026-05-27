/* ============================================================================
   markdown.js — Minimal, dependency-free, safe Markdown renderer.
   Handles the subset used by lecture notes: headings, bold/italic, inline &
   block code, blockquotes, ordered/unordered lists, horizontal rules, links
   and paragraphs. All input is HTML-escaped first so rendering is XSS-safe
   even for LLM-generated or pasted content.
   ========================================================================== */

/* Escape raw text so no HTML/script can be injected. */
function esc(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* Inline-level formatting applied to already-escaped text. */
function inline(text) {
  return text
    // inline code first so its contents are not further formatted
    .replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`)
    // bold then italic
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/(^|[^_])_([^_\n]+)_/g, "$1<em>$2</em>")
    // links [text](url) — url is restricted to http(s) for safety
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

/* Convert a Markdown string to an HTML string. */
export function renderMarkdown(md) {
  if (!md) return "";
  const lines = esc(md).replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let i = 0;
  let listType = null;          // 'ul' | 'ol' | null

  const closeList = () => { if (listType) { out.push(`</${listType}>`); listType = null; } };

  while (i < lines.length) {
    let line = lines[i];

    // fenced code block
    if (/^```/.test(line)) {
      closeList();
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++; // skip closing fence
      out.push(`<pre><code>${buf.join("\n")}</code></pre>`);
      continue;
    }

    // horizontal rule
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { closeList(); out.push("<hr />"); i++; continue; }

    // headings
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) { closeList(); const lv = h[1].length; out.push(`<h${lv}>${inline(h[2])}</h${lv}>`); i++; continue; }

    // blockquote
    if (/^>\s?/.test(line)) {
      closeList();
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, "")); i++; }
      out.push(`<blockquote>${inline(buf.join(" "))}</blockquote>`);
      continue;
    }

    // unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      if (listType !== "ul") { closeList(); out.push("<ul>"); listType = "ul"; }
      out.push(`<li>${inline(line.replace(/^\s*[-*+]\s+/, ""))}</li>`);
      i++; continue;
    }
    // ordered list
    if (/^\s*\d+[.)]\s+/.test(line)) {
      if (listType !== "ol") { closeList(); out.push("<ol>"); listType = "ol"; }
      out.push(`<li>${inline(line.replace(/^\s*\d+[.)]\s+/, ""))}</li>`);
      i++; continue;
    }

    // blank line
    if (/^\s*$/.test(line)) { closeList(); i++; continue; }

    // paragraph (merge consecutive non-blank, non-structural lines)
    closeList();
    const buf = [line];
    i++;
    while (i < lines.length && !/^\s*$/.test(lines[i]) &&
           !/^(#{1,6}\s|>\s?|```|\s*[-*+]\s|\s*\d+[.)]\s)/.test(lines[i]) &&
           !/^\s*([-*_])(\s*\1){2,}\s*$/.test(lines[i])) {
      buf.push(lines[i]); i++;
    }
    out.push(`<p>${inline(buf.join("<br />"))}</p>`);
  }
  closeList();
  return out.join("\n");
}

/* Split topic Markdown into study cards on `---` dividers.
   Each segment's leading `### Title` becomes the card title; the rest is body. */
export function splitCards(md) {
  if (!md) return [];
  return md
    .split(/\n-{3,}\n/)
    .map((seg) => seg.trim())
    .filter(Boolean)
    .map((seg, idx) => {
      const m = seg.match(/^#{1,6}\s+(.*)/);
      const title = m ? m[1].trim() : `Bölüm ${idx + 1}`;
      const body = m ? seg.replace(/^#{1,6}\s+.*\n?/, "").trim() : seg;
      return { title, html: renderMarkdown(body), bodyMd: body };
    });
}

/* Plain-text version of Markdown — used to feed source context to the LLM
   without burning tokens on formatting characters. */
export function toPlainText(md) {
  return (md || "")
    .replace(/\n-{3,}\n/g, "\n")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_`>]/g, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
}
