import { safeUrl } from "./feed";

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Renders a small, safe Markdown subset: `code`, **bold**, *italic*, [links](https://…).
 * Everything else is escaped, so changelog text can never inject HTML.
 */
export function inlineMarkdown(text: string): string {
  const codes: string[] = [];
  let html = escapeHtml(text).replace(/`([^`]+)`/g, (_, code: string) => {
    codes.push(`<code>${code}</code>`);
    return `\uE000${codes.length - 1}\uE000`;
  });
  html = html
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label: string, href: string) => {
      const url = safeUrl(href.replace(/&amp;/g, "&"));
      return url ? `<a href="${escapeHtml(url)}" rel="noopener">${label}</a>` : match;
    })
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^\w*])[*_]([^*_]+)[*_](?![\w*])/g, "$1<em>$2</em>");
  return html.replace(/\uE000(\d+)\uE000/g, (_, i: string) => codes[Number(i)] ?? "");
}

/** Paragraphs and simple `-` lists, each line rendered with {@link inlineMarkdown}. */
export function blockMarkdown(text: string): string {
  return text
    .trim()
    .split(/\n\s*\n/)
    .map((block) => {
      const lines = block.split("\n");
      if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
        const items = lines.map((l) => `<li>${inlineMarkdown(l.replace(/^\s*[-*]\s+/, ""))}</li>`);
        return `<ul>${items.join("")}</ul>`;
      }
      return `<p>${inlineMarkdown(lines.map((l) => l.trim()).join(" "))}</p>`;
    })
    .join("");
}
