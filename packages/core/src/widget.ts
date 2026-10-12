import { localizeRelease, parseFeed, safeUrl } from "./feed";
import { getMessages, type Messages } from "./i18n";
import { blockMarkdown, escapeHtml, inlineMarkdown } from "./markdown";
import { renderReleases } from "./render";
import { ENTRY_TYPES, type Feed, type Release } from "./types";
import { createStore, getUnread, latestKey, releaseKey } from "./unread";

const Base = (typeof HTMLElement === "undefined" ? class {} : HTMLElement) as typeof HTMLElement;

let instances = 0;

/**
 * `<derivative-widget src="/changelog.json">`: a "What's new" button with an unread badge
 * and a panel listing the latest releases. Use `mode="inline"` to render the list in place.
 *
 * Attributes: `src`, `lang` (also picks `translations` of the feed), `mode` (`popover` | `inline`),
 * `limit`, `storage-key`, `href`, `label`, `align` (`start` | `end`), `theme` (`light` | `dark`),
 * `types` (comma-separated entry types to show), `audience` (comma-separated audiences of the
 * reader; entries and releases with an audience are hidden from everyone else), `highlight`
 * (announce the newest unread release with a title once: `toast`, `banner` or `modal`; releases
 * marked `importance: "major"` come first), `hints` (mark page elements named by an entry's
 * `target` with `data-derivative-hint` while the entry is unread), `search` (adds a search field to
 * the panel), `heading-level` (2 to 6, the level of the release headings; default 3 in the panel
 * and 2 inline), `package` (monorepo feeds: only these packages, comma-separated, a trailing `*`
 * matches a prefix). Events: `derivative-open`, `derivative-close`, `derivative-read`,
 * `derivative-load`, `derivative-error`, `derivative-highlight`, `derivative-render` (the list was
 * drawn; `detail.list` is the element, for extensions that add to each release).
 */
export class DerivativeWidget extends Base {
  static observedAttributes = [
    "src",
    "lang",
    "mode",
    "limit",
    "label",
    "href",
    "align",
    "types",
    "search",
    "package",
    "heading-level",
    "highlight",
    "audience",
    "hints",
  ];

  /** Override any UI text. */
  messages: Partial<Messages> | undefined;

  #feed: Feed | undefined;
  #error = false;
  #open = false;
  #root: ShadowRoot | undefined;
  #id = `dv-${++instances}`;
  #abort: AbortController | undefined;
  #highlighted: Release | undefined;
  #hinted = new Set<Element>();
  #query = "";

  get feed(): Feed | undefined {
    return this.#feed;
  }

  /** Set a feed directly instead of loading `src`. */
  set feed(value: Feed | undefined) {
    this.#feed = value ? parseFeed(value) : undefined;
    this.#error = false;
    this.#pickHighlight();
    this.#render();
  }

  get open(): boolean {
    return this.#open;
  }

  get unreadCount(): number {
    const view = this.#view;
    return view ? getUnread(view, this.#store().get()).length : 0;
  }

  connectedCallback(): void {
    this.#root ??= this.attachShadow({ mode: "open" });
    this.#render();
    if (!this.#feed) void this.#load();
    document.addEventListener("pointerdown", this.#onOutside);
  }

  disconnectedCallback(): void {
    document.removeEventListener("pointerdown", this.#onOutside);
    this.#abort?.abort();
    this.#clearHints();
  }

  attributeChangedCallback(name: string, oldValue: string | null, value: string | null): void {
    if (!this.#root || oldValue === value) return;
    if (name === "src") void this.#load();
    else this.#render();
  }

  show(): void {
    if (this.#open || this.#mode === "inline") return;
    this.#open = true;
    this.#dismissHighlight();
    this.#render();
    this.#root?.querySelector<HTMLElement>(".panel")?.focus();
    this.#emit("derivative-open");
    this.markAllRead();
  }

  hide(returnFocus = true): void {
    if (!this.#open) return;
    this.#open = false;
    this.#render();
    if (returnFocus) this.#root?.querySelector<HTMLElement>(".trigger")?.focus();
    this.#emit("derivative-close");
  }

  toggle(): void {
    if (this.#open) this.hide();
    else this.show();
  }

  markAllRead(): void {
    const view = this.#view;
    if (!view) return;
    const key = latestKey(view);
    if (!key || key === this.#store().get()) return;
    this.#store().set(key);
    this.#emit("derivative-read", { lastSeen: key });
    this.#renderBadge();
    this.#syncHints();
  }

  /** Hides the highlight (toast, banner or modal) and remembers it for this release. */
  dismissHighlight(): void {
    const modal = this.#highlightKind === "modal";
    this.#dismissHighlight();
    this.#render();
    if (modal) this.#root?.querySelector<HTMLElement>(".trigger")?.focus();
  }

  #dismissHighlight(): void {
    if (!this.#highlighted) return;
    this.#highlightStore().set(releaseKey(this.#highlighted));
    this.#highlighted = undefined;
  }

  #highlightStore() {
    return createStore(`${this.getAttribute("storage-key") ?? "derivative:last-seen"}:announced`);
  }

  get #highlightKind(): "toast" | "banner" | "modal" | undefined {
    const value = this.getAttribute("highlight");
    if (value === null) return undefined;
    return value === "banner" || value === "modal" ? value : "toast";
  }

  /** The newest unread release with a title (`major` ones first), unless it was shown already. */
  #pickHighlight(): void {
    this.#highlighted = undefined;
    const view = this.#view;
    if (!view || !this.#highlightKind || this.#mode === "inline") return;
    const unread = getUnread(view, this.#store().get()).filter((r) => r.title);
    const release = unread.find((r) => r.importance === "major") ?? unread[0];
    if (!release || this.#highlightStore().get() === releaseKey(release)) return;
    this.#highlighted = release;
    this.#emit("derivative-highlight", { release: releaseKey(release) });
  }

  get #types(): Set<string> | undefined {
    const raw = this.getAttribute("types");
    if (!raw) return undefined;
    const set = new Set(
      raw.split(/[\s,]+/).filter((t) => (ENTRY_TYPES as readonly string[]).includes(t)),
    );
    return set.size ? set : undefined;
  }

  /**
   * The feed as this widget shows it: limited to the `package` attribute in monorepo feeds and to
   * what the `audience` attribute may see. Content with an audience is hidden from everyone else.
   */
  get #view(): Feed | undefined {
    const feed = this.#feed;
    if (!feed) return feed;
    const raw = this.getAttribute("package");
    const names = (raw ?? "")
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean);
    const match = (name: string | undefined) =>
      !!name && names.some((n) => (n.endsWith("*") ? name.startsWith(n.slice(0, -1)) : name === n));
    const viewer = new Set(
      (this.getAttribute("audience") ?? "")
        .split(/[\s,]+/)
        .filter(Boolean)
        .map((a) => a.toLowerCase()),
    );
    const allowed = (audience: string[] | undefined) =>
      !audience?.length || audience.some((a) => viewer.has(a.toLowerCase()));
    const releases = feed.releases
      .filter((r) => (names.length ? match(r.package) : true) && allowed(r.audience))
      .map((r) =>
        r.entries.some((e) => !allowed(e.audience))
          ? { ...r, entries: r.entries.filter((e) => allowed(e.audience)) }
          : r,
      )
      .filter((r) => r.entries.length > 0 || r.title || r.summary);
    return { ...feed, releases };
  }

  /** Release headings: h3 under the panel's h2, h2 when inline (override with `heading-level`). */
  get #headingLevel(): 2 | 3 | 4 | 5 | 6 {
    const n = Number.parseInt(this.getAttribute("heading-level") ?? "", 10);
    if (n >= 2 && n <= 6) return n as 2 | 3 | 4 | 5 | 6;
    return this.#mode === "inline" ? 2 : 3;
  }

  get #searchable(): boolean {
    return this.hasAttribute("search");
  }

  #searchHtml(t: Messages): string {
    return this.#searchable
      ? `<input class="search" part="search" type="search" autocomplete="off" placeholder="${escapeHtml(t.search)}" aria-label="${escapeHtml(t.search)}" value="${escapeHtml(this.#query)}">`
      : "";
  }

  #bindSearch(): void {
    const input = this.#root?.querySelector<HTMLInputElement>(".search");
    input?.addEventListener("input", () => {
      this.#query = input.value;
      const list = this.#root?.querySelector<HTMLElement>(".list");
      if (list) {
        list.innerHTML = this.#listHtml();
        this.#emit("derivative-render", { list });
      }
    });
  }

  get #mode(): "popover" | "inline" {
    return this.getAttribute("mode") === "inline" ? "inline" : "popover";
  }

  get #t(): Messages {
    return getMessages(this.getAttribute("lang") ?? document.documentElement.lang, this.messages);
  }

  #store() {
    return createStore(this.getAttribute("storage-key") ?? "derivative:last-seen");
  }

  async #load(): Promise<void> {
    const src = this.getAttribute("src");
    if (!src) return;
    this.#abort?.abort();
    const abort = new AbortController();
    this.#abort = abort;
    try {
      const response = await fetch(src, { signal: abort.signal });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      this.#feed = parseFeed(await response.json());
      this.#error = false;
      this.#pickHighlight();
      this.#emit("derivative-load", { feed: this.#feed });
    } catch (error) {
      if (abort.signal.aborted) return;
      this.#error = true;
      this.#emit("derivative-error", { error });
    }
    this.#render();
    if (this.#mode === "inline") this.markAllRead();
  }

  #onOutside = (event: Event): void => {
    if (this.#open && !event.composedPath().includes(this)) this.hide(false);
  };

  #onKeydown = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && this.#open) {
      event.stopPropagation();
      this.hide();
    }
  };

  #emit(type: string, detail: unknown = {}): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  #listHtml(): string {
    const t = this.#t;
    if (this.#error) return `<p class="state">${escapeHtml(t.error)}</p>`;
    const view = this.#view;
    if (!view) return `<p class="state" aria-busy="true"></p>`;
    const limit = Number.parseInt(this.getAttribute("limit") ?? "", 10);
    const types = this.#types;
    const filtered = types
      ? view.releases
          .map((r) => ({ ...r, entries: r.entries.filter((e) => types.has(e.type)) }))
          .filter((r) => r.entries.length > 0 || r.title || r.summary)
      : view.releases;
    const query = this.#searchable ? this.#query.trim().toLowerCase() : "";
    const matching = query ? filtered.filter((r) => matches(r, query)) : filtered;
    const releases = query ? matching : matching.slice(0, Number.isNaN(limit) ? 10 : limit);
    if (releases.length === 0) {
      return `<p class="state">${escapeHtml(query ? t.noResults : t.empty)}</p>`;
    }
    const unread = new Set(getUnread(view, this.#store().get()).map(releaseKey));
    const html = renderReleases(releases, {
      lang: this.getAttribute("lang") ?? undefined,
      messages: this.messages,
      headingLevel: this.#headingLevel,
    });
    // Mark unread releases so they can be highlighted.
    let index = 0;
    return html.replace(/<article class="dv-release"/g, (match) => {
      const release = releases[index++];
      return release && unread.has(releaseKey(release)) ? `${match} data-unread` : match;
    });
  }

  #highlightHtml(t: Messages): string {
    const release = this.#highlighted;
    const kind = this.#highlightKind;
    if (!release || !kind || this.#open) return "";
    const shown = localizeRelease(
      release,
      this.getAttribute("lang") ?? document.documentElement.lang,
    );
    const summary = shown.summary
      ? kind === "modal"
        ? `<div class="highlight-text" part="highlight-text">${blockMarkdown(shown.summary)}</div>`
        : `<p class="highlight-text" part="highlight-text">${inlineMarkdown(shown.summary.split(/\n\s*\n/)[0] ?? "")}</p>`
      : "";
    const image = shown.media?.find((m) => m.type === "image");
    const imageUrl = kind === "modal" && image ? safeUrl(image.url) : undefined;
    const media = imageUrl
      ? `<img class="dv-image" part="media" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(image?.alt ?? "")}">`
      : "";
    const actions = (kind === "modal" ? (shown.links ?? []) : []).flatMap((l) => {
      const url = safeUrl(l.url);
      return url
        ? [
            `<a class="highlight-link" part="highlight-action" href="${escapeHtml(url)}" rel="noopener">${escapeHtml(l.label)}</a>`,
          ]
        : [];
    });
    const align = this.getAttribute("align") === "start" ? "start" : "end";
    const titleId = `${this.#id}-highlight`;
    const dialog = kind === "modal";
    return `${dialog ? '<div class="backdrop" part="backdrop"></div>' : ""}<div class="highlight" part="highlight" data-kind="${kind}" data-align="${align}" ${
      dialog
        ? `role="dialog" aria-modal="true" aria-labelledby="${titleId}" tabindex="-1"`
        : 'role="status"'
    }>
  <p class="highlight-title" part="highlight-title" id="${titleId}"><span class="dv-type">${escapeHtml(t.types.feature)}</span> ${escapeHtml(shown.title ?? "")}</p>${media}${summary}
  <div class="highlight-actions">${actions.join("")}<button class="highlight-show" part="highlight-action" type="button">${escapeHtml(t.show)}</button><button class="highlight-dismiss" part="highlight-dismiss" type="button" aria-label="${escapeHtml(t.dismiss)}">×</button></div>
</div>`;
  }

  #renderBadge(): void {
    const badge = this.#root?.querySelector<HTMLElement>(".badge");
    if (!badge) return;
    const count = this.unreadCount;
    badge.hidden = count === 0;
    badge.textContent = count > 9 ? "9+" : String(count);
    const sr = this.#root?.querySelector<HTMLElement>(".sr-count");
    if (sr) sr.textContent = count ? `, ${this.#t.unread.replace("{count}", String(count))}` : "";
  }

  #render(): void {
    const root = this.#root;
    if (!root) return;
    const t = this.#t;
    const label = this.getAttribute("label") ?? t.whatsNew;
    const href = this.getAttribute("href") ?? this.#feed?.link;
    const footer = href
      ? `<a class="all" part="link" href="${escapeHtml(href)}">${escapeHtml(t.allChanges)}</a>`
      : "";

    if (this.#mode === "inline") {
      root.innerHTML = `<style>${CSS}</style>${this.#searchHtml(t)}<div class="list inline" part="list">${this.#listHtml()}</div>${footer}`;
      this.#bindSearch();
      this.#emitRender();
      return;
    }

    root.innerHTML = `<style>${CSS}</style>
<button class="trigger" part="button" type="button" aria-expanded="${this.#open}" aria-controls="${this.#id}">
  <slot name="icon"><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6V11a7 7 0 0 0-5.5-6.84V3.5a1.5 1.5 0 0 0-3 0v.66A7 7 0 0 0 5 11v5l-2 2v1h18v-1Z"/></svg></slot>
  <span class="label"><slot>${escapeHtml(label)}</slot></span><span class="sr-count sr"></span>
  <span class="badge" part="badge" aria-hidden="true" hidden></span>
</button>
<section class="panel" part="panel" id="${this.#id}" role="dialog" aria-label="${escapeHtml(label)}" tabindex="-1" data-align="${this.getAttribute("align") === "start" ? "start" : "end"}" ${this.#open ? "" : "hidden"}>
  <header part="header"><h2 part="title">${escapeHtml(label)}</h2><button class="close" part="close" type="button" aria-label="${escapeHtml(t.close)}">×</button></header>
  ${this.#open ? this.#searchHtml(t) : ""}
  <div class="list" part="list">${this.#open ? this.#listHtml() : ""}</div>
  ${footer}
</section>${this.#highlightHtml(t)}`;
    root.querySelector(".trigger")?.addEventListener("click", () => this.toggle());
    root.querySelector(".close")?.addEventListener("click", () => this.hide());
    root.querySelector(".highlight-show")?.addEventListener("click", () => this.show());
    root
      .querySelector(".highlight-dismiss")
      ?.addEventListener("click", () => this.dismissHighlight());
    root.querySelector(".backdrop")?.addEventListener("click", () => this.dismissHighlight());
    const modal = root.querySelector<HTMLElement>('.highlight[data-kind="modal"]');
    if (modal) {
      modal.addEventListener("keydown", this.#onModalKeydown as EventListener);
      modal.focus();
    }
    root.querySelector(".panel")?.addEventListener("keydown", this.#onKeydown as EventListener);
    this.#bindSearch();
    this.#renderBadge();
    this.#syncHints();
    this.#emitRender();
  }

  #onModalKeydown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      event.stopPropagation();
      this.dismissHighlight();
      return;
    }
    if (event.key !== "Tab") return;
    const modal = event.currentTarget as HTMLElement;
    const items = [...modal.querySelectorAll<HTMLElement>("a[href], button")];
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    const active = this.#root?.activeElement;
    if (event.shiftKey && (active === first || active === modal)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  #clearHints(): void {
    for (const element of this.#hinted) element.removeAttribute("data-derivative-hint");
    this.#hinted.clear();
  }

  /** Marks the page elements that unread entries point to (needs the `hints` attribute). */
  #syncHints(): void {
    this.#clearHints();
    const view = this.#view;
    if (!view || !this.hasAttribute("hints") || typeof document === "undefined") return;
    for (const release of getUnread(view, this.#store().get())) {
      for (const entry of release.entries) {
        if (!entry.target) continue;
        let found: NodeListOf<Element>;
        try {
          found = document.querySelectorAll(entry.target);
        } catch {
          continue; // Not a valid selector.
        }
        for (const element of found) {
          element.setAttribute("data-derivative-hint", entry.type);
          this.#hinted.add(element);
        }
      }
    }
  }

  #emitRender(): void {
    const list = this.#root?.querySelector<HTMLElement>(".list");
    if (list && (this.#mode === "inline" || this.#open)) this.#emit("derivative-render", { list });
  }
}

/** True when the query appears in the release's version, title, summary or any entry. */
function matches(release: Release, query: string): boolean {
  const haystack = [
    release.version,
    release.package,
    release.title,
    release.summary,
    ...release.entries.flatMap((e) => [e.text, e.details, e.scope]),
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
  return haystack.includes(query);
}

/** Registers `<derivative-widget>` (or another tag name). Safe to call more than once and on the server. */
export function defineDerivativeWidget(tagName = "derivative-widget"): void {
  if (typeof customElements === "undefined" || customElements.get(tagName)) return;
  customElements.define(tagName, class extends DerivativeWidget {});
}

const CSS = `
:host {
  --dv-accent: #2f5bea;
  --dv-bg: #ffffff;
  --dv-fg: #16181d;
  --dv-muted: #5c6370;
  --dv-border: #e3e5ea;
  --dv-good: #166534;
  --dv-warn: #9a3412;
  --dv-radius: 10px;
  --dv-button-radius: 999px;
  --dv-button-bg: var(--dv-bg);
  --dv-button-fg: inherit;
  --dv-badge-fg: var(--dv-bg);
  --dv-shadow: 0 12px 32px rgb(0 0 0 / .14);
  --dv-max-height: min(70vh, 560px);
  --dv-z: 1000;
  --dv-width: 380px;
  --dv-font: system-ui, -apple-system, "Segoe UI", sans-serif;
  position: relative;
  display: inline-block;
  font-family: var(--dv-font);
  color: var(--dv-fg);
}
@media (prefers-color-scheme: dark) {
  :host(:not([theme="light"])) { --dv-bg: #1b1d22; --dv-fg: #eceef2; --dv-muted: #a3a9b5; --dv-border: #30333b; --dv-accent: #8aa6ff; --dv-good: #4ade80; --dv-warn: #fb923c; }
}
:host([theme="dark"]) { --dv-bg: #1b1d22; --dv-fg: #eceef2; --dv-muted: #a3a9b5; --dv-border: #30333b; --dv-accent: #8aa6ff; --dv-good: #4ade80; --dv-warn: #fb923c; }
:host([mode="inline"]) { display: block; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.trigger {
  position: relative; display: inline-flex; align-items: center; gap: .4rem;
  font: inherit; font-size: .875rem; color: var(--dv-button-fg); background: var(--dv-button-bg);
  border: 1px solid var(--dv-border); border-radius: var(--dv-button-radius); padding: .4rem .8rem; cursor: pointer;
}
.trigger:hover { border-color: var(--dv-accent); }
.trigger:focus-visible, .close:focus-visible, .panel:focus-visible, a:focus-visible { outline: 2px solid var(--dv-accent); outline-offset: 2px; }
.badge {
  min-width: 1.25rem; height: 1.25rem; padding: 0 .3rem; box-sizing: border-box; border-radius: 999px;
  background: var(--dv-accent); color: var(--dv-badge-fg); font-size: .7rem; font-weight: 700;
  display: inline-grid; place-items: center;
}
.badge[hidden] { display: none; }
.panel {
  position: absolute; top: calc(100% + .5rem); z-index: var(--dv-z); width: min(var(--dv-width), calc(100vw - 2rem));
  max-height: var(--dv-max-height); overflow: auto; box-sizing: border-box;
  background: var(--dv-bg); color: var(--dv-fg); border: 1px solid var(--dv-border);
  border-radius: var(--dv-radius); box-shadow: var(--dv-shadow); padding: 0 1rem 1rem;
}
.panel[data-align="end"] { inset-inline-end: 0; }
.panel[data-align="start"] { inset-inline-start: 0; }
.panel[hidden] { display: none; }
header { position: sticky; top: 0; display: flex; align-items: center; justify-content: space-between; padding: .85rem 0 .5rem; background: var(--dv-bg); }
h2 { margin: 0; font-size: 1rem; }
.close { font: inherit; font-size: 1.25rem; line-height: 1; background: none; border: 0; color: var(--dv-muted); cursor: pointer; padding: .25rem .4rem; border-radius: 6px; }
.search { display: block; width: 100%; box-sizing: border-box; margin: 0 0 .25rem; font: inherit; font-size: .875rem; color: inherit; background: var(--dv-bg); border: 1px solid var(--dv-border); border-radius: 8px; padding: .45rem .65rem; }
.search:focus-visible { outline: 2px solid var(--dv-accent); outline-offset: 1px; }
.dv-release { padding: .85rem 0; border-top: 1px solid var(--dv-border); }
.dv-release[data-unread] .dv-title::after { content: ""; display: inline-block; width: .45rem; height: .45rem; margin-inline-start: .4rem; border-radius: 50%; background: var(--dv-accent); vertical-align: middle; }
.dv-title { margin: 0; font-size: .95rem; }
.dv-meta { margin: .1rem 0 0; color: var(--dv-muted); font-size: .8rem; }
.dv-image { display: block; max-width: 100%; border-radius: 6px; margin-top: .6rem; }
.dv-summary { font-size: .875rem; }
.dv-summary p { margin: .5rem 0 0; }
.dv-entries { list-style: none; margin: .6rem 0 0; padding: 0; display: grid; gap: .4rem; font-size: .875rem; line-height: 1.45; }
.dv-type { display: inline-block; margin-inline-end: .3rem; padding: .05rem .4rem; border-radius: 4px; font-size: .7rem; font-weight: 600; text-transform: uppercase; letter-spacing: .03em; color: var(--dv-accent); background: color-mix(in srgb, var(--dv-accent) 12%, transparent); }
.dv-entry[data-type="breaking"] .dv-type, .dv-entry[data-type="security"] .dv-type { color: var(--dv-warn); background: color-mix(in srgb, var(--dv-warn) 14%, transparent); }
.dv-entry[data-type="fix"] .dv-type { color: var(--dv-good); background: color-mix(in srgb, var(--dv-good) 14%, transparent); }
.dv-scope { color: var(--dv-muted); }
.dv-details { margin-top: .2rem; color: var(--dv-muted); }
.dv-details p, .dv-details ul { margin: .2rem 0; }
.dv-link { color: var(--dv-muted); text-decoration: none; }
code { font-size: .85em; padding: .05em .3em; border-radius: 4px; background: color-mix(in srgb, var(--dv-fg) 8%, transparent); }
a { color: var(--dv-accent); }
.all { display: inline-block; margin: .75rem 0 .25rem; font-size: .875rem; }
.state { color: var(--dv-muted); font-size: .875rem; min-height: 1.5rem; }
.highlight {
  position: absolute; top: calc(100% + .5rem); z-index: calc(var(--dv-z) - 1); width: min(300px, calc(100vw - 2rem)); box-sizing: border-box;
  background: var(--dv-bg); color: var(--dv-fg); border: 1px solid var(--dv-border); border-inline-start: 3px solid var(--dv-accent);
  border-radius: var(--dv-radius); box-shadow: var(--dv-shadow); padding: .7rem .8rem; font-size: .875rem;
}
.highlight[data-align="end"] { inset-inline-end: 0; }
.highlight[data-align="start"] { inset-inline-start: 0; }
.highlight[data-kind="banner"] { position: fixed; top: 0; inset-inline: 0; width: auto; border-radius: 0; border-width: 0 0 1px; border-inline-start: 0; z-index: var(--dv-z); display: flex; flex-wrap: wrap; align-items: center; gap: .25rem 1rem; padding: .6rem 1rem; }
.highlight[data-kind="banner"] .highlight-title { flex: 1 1 14rem; }
.highlight[data-kind="banner"] .highlight-text { flex: 2 1 16rem; margin: 0; }
.highlight[data-kind="banner"] .highlight-actions { margin: 0; gap: .5rem; }
.highlight[data-kind="modal"] { position: fixed; inset: 50% auto auto 50%; transform: translate(-50%, -50%); width: min(30rem, calc(100vw - 2rem)); max-height: calc(100vh - 2rem); overflow: auto; z-index: calc(var(--dv-z) + 1); border-inline-start: 1px solid var(--dv-border); padding: 1.25rem; }
.highlight[data-kind="modal"]:focus-visible { outline: 2px solid var(--dv-accent); outline-offset: 2px; }
.backdrop { position: fixed; inset: 0; z-index: var(--dv-z); background: rgb(0 0 0 / .45); }
.highlight-title { margin: 0; font-weight: 600; }
.highlight[data-kind="modal"] .highlight-title { font-size: 1.05rem; }
.highlight-text { margin: .3rem 0 0; color: var(--dv-muted); }
.highlight-text p { margin: .4rem 0 0; }
.highlight-actions { display: flex; align-items: center; justify-content: space-between; gap: .75rem; margin-top: .5rem; }
.highlight-link { margin-inline-end: auto; }
.highlight-show { font: inherit; font-weight: 600; color: var(--dv-accent); background: none; border: 0; padding: .2rem 0; cursor: pointer; }
.highlight-dismiss { font: inherit; font-size: 1.1rem; line-height: 1; color: var(--dv-muted); background: none; border: 0; padding: .2rem .4rem; border-radius: 6px; cursor: pointer; }
.highlight-show:focus-visible, .highlight-dismiss:focus-visible { outline: 2px solid var(--dv-accent); outline-offset: 2px; }
.dv-links { list-style: none; padding: 0; margin: .6rem 0 0; display: flex; flex-wrap: wrap; gap: .3rem 1rem; font-size: .875rem; }
.dv-media { display: block; max-width: 100%; border-radius: 6px; margin-top: .6rem; }
@media (prefers-reduced-motion: no-preference) { .panel:not([hidden]), .highlight:not([data-kind="banner"]):not([data-kind="modal"]) { animation: dv-in .14s ease-out; } }
@keyframes dv-in { from { opacity: 0; transform: translateY(-4px); } }
`;
