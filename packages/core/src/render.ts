import { formatDate, getMessages, type Messages } from "./i18n";
import { blockMarkdown, escapeHtml, inlineMarkdown } from "./markdown";
import type { Feed, Release } from "./types";
import { releaseKey } from "./unread";

export interface RenderOptions {
  lang?: string;
  messages?: Partial<Messages>;
  /** Heading level of each release title. Default 2. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
}

/** HTML for a list of releases. Class names start with `dv-`; style them as you like. */
export function renderReleases(releases: Release[], options: RenderOptions = {}): string {
  const t = getMessages(options.lang, options.messages);
  const h = `h${options.headingLevel ?? 2}`;
  return releases
    .map((release) => {
      const name = release.title ?? (release.version ? release.version : t.unreleased);
      const meta = [
        release.title && release.version ? escapeHtml(release.version) : "",
        release.package ? escapeHtml(release.package) : "",
        release.date
          ? `<time datetime="${escapeHtml(release.date)}">${escapeHtml(formatDate(release.date, options.lang))}</time>`
          : "",
      ].filter(Boolean);
      const entries = release.entries
        .map((entry) => {
          const scope = entry.scope
            ? `<span class="dv-scope">${escapeHtml(entry.scope)}:</span> `
            : "";
          const link = entry.link
            ? ` <a class="dv-link" href="${escapeHtml(entry.link)}" rel="noopener">#</a>`
            : "";
          const details = entry.details
            ? `<div class="dv-details">${blockMarkdown(entry.details)}</div>`
            : "";
          return `<li class="dv-entry" data-type="${entry.type}"><span class="dv-type">${escapeHtml(t.types[entry.type])}</span> <span class="dv-text">${scope}${inlineMarkdown(entry.text)}${link}</span>${details}</li>`;
        })
        .join("");
      return [
        `<article class="dv-release" id="${escapeHtml(slug(releaseKey(release)))}">`,
        `<${h} class="dv-title">${escapeHtml(name)}</${h}>`,
        meta.length ? `<p class="dv-meta">${meta.join(" · ")}</p>` : "",
        release.image ? `<img class="dv-image" src="${escapeHtml(release.image)}" alt="" />` : "",
        release.summary ? `<div class="dv-summary">${blockMarkdown(release.summary)}</div>` : "",
        entries ? `<ul class="dv-entries">${entries}</ul>` : "",
        "</article>",
      ].join("");
    })
    .join("");
}

/** A complete, self-contained changelog page. */
export function renderPage(feed: Feed, options: RenderOptions & { css?: string } = {}): string {
  const t = getMessages(options.lang, options.messages);
  const title = feed.title ?? t.allChanges;
  return `<!doctype html>
<html lang="${escapeHtml(options.lang ?? "en")}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>${options.css ?? PAGE_CSS}</style>
</head>
<body>
<main>
<h1>${escapeHtml(title)}</h1>
${feed.releases.length ? renderReleases(feed.releases, options) : `<p>${escapeHtml(t.empty)}</p>`}
</main>
</body>
</html>
`;
}

/** An Atom feed, so readers can follow updates in a feed reader. */
export function renderAtom(feed: Feed, options: RenderOptions & { selfUrl?: string } = {}): string {
  const t = getMessages(options.lang, options.messages);
  const site = feed.link ?? options.selfUrl ?? "";
  const updated = feed.releases[0]?.date ?? feed.generatedAt ?? new Date(0).toISOString();
  const entries = feed.releases
    .map((release) => {
      const key = releaseKey(release);
      const html = renderReleases([{ ...release, title: undefined }], {
        ...options,
        headingLevel: 2,
      }).replace(/<h2[^>]*>.*?<\/h2>/, "");
      return `  <entry>
    <title>${escapeHtml(release.title ?? release.version ?? t.unreleased)}</title>
    <id>${escapeHtml(site ? `${site}#${slug(key)}` : `urn:derivative:${key}`)}</id>
    ${site ? `<link href="${escapeHtml(`${site}#${slug(key)}`)}" />` : ""}
    <updated>${escapeHtml(toDateTime(release.date ?? updated))}</updated>
    <content type="html">${escapeHtml(html)}</content>
  </entry>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeHtml(feed.title ?? t.allChanges)}</title>
  <id>${escapeHtml(options.selfUrl ?? site ?? "urn:derivative")}</id>
  ${site ? `<link href="${escapeHtml(site)}" />` : ""}
  ${options.selfUrl ? `<link rel="self" href="${escapeHtml(options.selfUrl)}" />` : ""}
  <updated>${escapeHtml(toDateTime(updated))}</updated>
${entries}
</feed>
`;
}

/**
 * JSON Feed 1.1 (https://jsonfeed.org/version/1.1). Each release is one item with HTML content;
 * `selfUrl` is the public URL of the JSON Feed file itself.
 */
export function renderJsonFeed(
  feed: Feed,
  options: RenderOptions & { selfUrl?: string } = {},
): string {
  const t = getMessages(options.lang, options.messages);
  const site = feed.link;
  const items = feed.releases.map((release) => {
    const key = releaseKey(release);
    const url = site ? `${site}#${slug(key)}` : undefined;
    const html = renderReleases([{ ...release, title: undefined }], {
      ...options,
      headingLevel: 2,
    }).replace(/<h2[^>]*>.*?<\/h2>/, "");
    return {
      id: url ?? `urn:derivative:${key}`,
      ...(url ? { url } : {}),
      title: release.title ?? release.version ?? t.unreleased,
      content_html: html,
      ...(release.summary ? { summary: plainSummary(release.summary) } : {}),
      ...(release.image ? { image: release.image } : {}),
      ...(release.date ? { date_published: toDateTime(release.date) } : {}),
      ...(release.package ? { tags: [release.package] } : {}),
    };
  });
  return `${JSON.stringify(
    {
      version: "https://jsonfeed.org/version/1.1",
      title: feed.title ?? t.allChanges,
      ...(site ? { home_page_url: site } : {}),
      ...(options.selfUrl ? { feed_url: options.selfUrl } : {}),
      ...(options.lang ? { language: options.lang } : {}),
      items,
    },
    null,
    2,
  )}\n`;
}

function plainSummary(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*`]/g, "")
    .trim();
}

function toDateTime(date: string): string {
  return date.length === 10 ? `${date}T00:00:00Z` : date;
}

export function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const PAGE_CSS = `
:root { color-scheme: light dark; --accent: #2f5bea; }
body { margin: 0; font: 16px/1.6 system-ui, sans-serif; background: Canvas; color: CanvasText; }
main { max-width: 42rem; margin: 0 auto; padding: 3rem 1rem; }
.dv-release { padding: 1.5rem 0; border-top: 1px solid color-mix(in srgb, CanvasText 15%, transparent); }
.dv-title { margin: 0; font-size: 1.25rem; }
.dv-meta { margin: .25rem 0 0; opacity: .7; font-size: .875rem; }
.dv-image { max-width: 100%; border-radius: 8px; margin-top: 1rem; }
.dv-entries { list-style: none; padding: 0; margin: 1rem 0 0; display: grid; gap: .5rem; }
.dv-type { display: inline-block; min-width: 5.5rem; font-size: .75rem; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: var(--accent); }
.dv-entry[data-type="breaking"] .dv-type, .dv-entry[data-type="security"] .dv-type { color: #c2410c; }
.dv-details { margin: .25rem 0 0 5.75rem; opacity: .85; font-size: .9375rem; }
.dv-details p { margin: .25rem 0; }
code { font-size: .875em; padding: .1em .3em; border-radius: 4px; background: color-mix(in srgb, CanvasText 8%, transparent); }
a { color: var(--accent); }
`;
