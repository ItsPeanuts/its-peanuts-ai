/**
 * Converts simple markdown (###, -, **) to HTML.
 * Handles headings, unordered lists, bold text, and paragraphs.
 */
export function markdownToHtml(md: string): string {
  if (!md) return "";

  const lines = md.split("\n");
  const out: string[] = [];
  let inList = false;

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (/^###\s+/.test(line)) {
      if (inList) { out.push("</ul>"); inList = false; }
      const text = applyInline(line.replace(/^###\s+/, ""));
      out.push(`<h3 class="text-sm font-bold text-gray-900 mt-5 mb-2">${text}</h3>`);
    } else if (/^##\s+/.test(line)) {
      if (inList) { out.push("</ul>"); inList = false; }
      const text = applyInline(line.replace(/^##\s+/, ""));
      out.push(`<h2 class="text-base font-bold text-gray-900 mt-6 mb-2">${text}</h2>`);
    } else if (/^[-*]\s+/.test(line)) {
      if (!inList) { out.push('<ul class="list-disc pl-5 space-y-1 my-2">'); inList = true; }
      const text = applyInline(line.replace(/^[-*]\s+/, ""));
      out.push(`<li class="text-sm text-gray-600">${text}</li>`);
    } else if (line.trim() === "") {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push("");
    } else {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push(`<p class="text-sm text-gray-600 leading-relaxed my-2">${applyInline(line)}</p>`);
    }
  }

  if (inList) out.push("</ul>");

  return out.filter(Boolean).join("\n");
}

function applyInline(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}
