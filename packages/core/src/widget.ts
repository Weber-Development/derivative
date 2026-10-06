import { parseFeed } from "./feed";
import { getMessages, type Messages } from "./i18n";
import { escapeHtml, inlineMarkdown } from "./markdown";
import { renderReleases } from "./render";
import { ENTRY_TYPES, type Feed, type Release } from "./types";
import { createStore, getUnread, latestKey, releaseKey } from "./unread";

const Base = (typeof HTMLElement === "undefined" ? class {} : HTMLElement) as typeof HTMLElement;

let instances = 0;

/**
 * `<derivative-widget src="/changelog.json">`: a "What's new" button with an unread badge
 * and a panel listing the latest releases. Use `mode="inline"` to render the list in place.
 *
 * Attributes: `src`, `lang`, `mode` (`popover` | `inline`), `limit`, `storage-key`, `href`,
 * `label`, `align` (`start` | `end`), `types` (comma-separated entry types to show), `announce`
 * (show a toast once for a new release with a title), `search` (adds a search field to the panel). Events: `derivative-open`,
 * `derivative-close`, `derivative-read`, `derivative-load`, `derivative-error`,
 * `derivative-announce`.
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
  ];

  /** Override any UI text. */
  messages: Partial<Messages> | undefined;

  #feed: Feed | undefined;
  #error = false;
  #open = false;
  #root: ShadowRoot | undefined;
  #id = `dv-${++instances}`;
  #abort: AbortController | undefined;
  #toast: Release | undefined;
  #query = "";

  get feed(): Feed | undefined {
    return this.#feed;
  }

  /** Set a feed directly instead of loading `src`. */
  set feed(value: Feed | undefined) {
    this.#feed = value ? parseFeed(value) : undefined;
    this.#error = false;
    this.#pickToast();
    this.#render();
  }

  get open(): boolean {
    return this.#open;
  }

  get unreadCount(): number {
    return this.#feed ? getUnread(this.#feed, this.#store().get()).length : 0;
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
  }

  attributeChangedCallback(name: string, oldValue: string | null, value: string | null): void {
    if (!this.#root || oldValue === value) return;
    if (name === "src") void this.#load();
    else this.#render();
  }

  show(): void {
    if (this.#open || this.#mode === "inline") return;
    this.#open = true;
    this.#dismissToast();
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
    if (!this.#feed) return;
    const key = latestKey(this.#feed);
    if (!key || key === this.#store().get()) return;
    this.#store().set(key);
    this.#emit("derivative-read", { lastSeen: key });
    this.#renderBadge();
  }

  /** Hides the announcement toast and remembers it for this release. */
  dismissToast(): void {
    this.#dismissToast();
    this.#render();
  }

  #dismissToast(): void {
    if (!this.#toast) return;
    this.#toastStore().set(releaseKey(this.#toast));
    this.#toast = undefined;
  }

  #toastStore() {
    return createStore(`${this.getAttribute("storage-key") ?? "derivative:last-seen"}:announced`);
  }

  /** The newest unread release with a title, unless it was announced already. */
  #pickToast(): void {
    this.#toast = undefined;
    if (!this.#feed || !this.hasAttribute("announce") || this.#mode === "inline") return;
    const release = getUnread(this.#feed, this.#store().get()).find((r) => r.title);
    if (!release || this.#toastStore().get() === releaseKey(release)) return;
    this.#toast = release;
    this.#emit("derivative-announce", { release: releaseKey(release) });
  }

  get #types(): Set<string> | undefined {
    const raw = this.getAttribute("types");
    if (!raw) return undefined;
    const set = new Set(
      raw.split(/[\s,]+/).filter((t) => (ENTRY_TYPES as readonly string[]).includes(t)),
    );
    return set.size ? set : undefined;
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
      if (list) list.innerHTML = this.#listHtml();
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
      this.#pickToast();
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
    if (!this.#feed) return `<p class="state" aria-busy="true"></p>`;
    const limit = Number.parseInt(this.getAttribute("limit") ?? "", 10);
    const types = this.#types;
    const filtered = types
      ? this.#feed.releases
          .map((r) => ({ ...r, entries: r.entries.filter((e) => types.has(e.type)) }))
          .filter((r) => r.entries.length > 0 || r.title || r.summary)
      : this.#feed.releases;
    const query = this.#searchable ? this.#query.trim().toLowerCase() : "";
    const matching = query ? filtered.filter((r) => matches(r, query)) : filtered;
    const releases = query ? matching : matching.slice(0, Number.isNaN(limit) ? 10 : limit);
    if (releases.length === 0) {
      return `<p class="state">${escapeHtml(query ? t.noResults : t.empty)}</p>`;
    }
    const unread = new Set(getUnread(this.#feed, this.#store().get()).map(releaseKey));
    const html = renderReleases(releases, {
      lang: this.getAttribute("lang") ?? undefined,
      messages: this.messages,
      headingLevel: 3,
    });
    // Mark unread releases so they can be highlighted.
    let index = 0;
    return html.replace(/<article class="dv-release"/g, (match) => {
      const release = releases[index++];
      return release && unread.has(releaseKey(release)) ? `${match} data-unread` : match;
    });
  }

  #toastHtml(t: Messages): string {
    const release = this.#toast;
    if (!release || this.#open) return "";
    const summary = release.summary
      ? `<p class="toast-text">${inlineMarkdown(release.summary.split(/\n\s*\n/)[0] ?? "")}</p>`
      : "";
    return `<div class="toast" part="toast" role="status" data-align="${this.getAttribute("align") === "start" ? "start" : "end"}">
  <p class="toast-title"><span class="dv-type">${escapeHtml(t.types.feature)}</span> ${escapeHtml(release.title ?? "")}</p>${summary}
  <div class="toast-actions"><button class="toast-show" type="button">${escapeHtml(t.show)}</button><button class="toast-dismiss" type="button" aria-label="${escapeHtml(t.dismiss)}">×</button></div>
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
      return;
    }

    root.innerHTML = `<style>${CSS}</style>
<button class="trigger" part="button" type="button" aria-expanded="${this.#open}" aria-controls="${this.#id}">
  <slot name="icon"><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6V11a7 7 0 0 0-5.5-6.84V3.5a1.5 1.5 0 0 0-3 0v.66A7 7 0 0 0 5 11v5l-2 2v1h18v-1Z"/></svg></slot>
  <span class="label"><slot>${escapeHtml(label)}</slot></span><span class="sr-count sr"></span>
  <span class="badge" part="badge" aria-hidden="true" hidden></span>
</button>
<section class="panel" part="panel" id="${this.#id}" role="dialog" aria-label="${escapeHtml(label)}" tabindex="-1" data-align="${this.getAttribute("align") === "start" ? "start" : "end"}" ${this.#open ? "" : "hidden"}>
  <header><h2>${escapeHtml(label)}</h2><button class="close" type="button" aria-label="${escapeHtml(t.close)}">×</button></header>
  ${this.#open ? this.#searchHtml(t) : ""}
  <div class="list" part="list">${this.#open ? this.#listHtml() : ""}</div>
  ${footer}
</section>${this.#toastHtml(t)}`;
    root.querySelector(".trigger")?.addEventListener("click", () => this.toggle());
    root.querySelector(".close")?.addEventListener("click", () => this.hide());
    root.querySelector(".toast-show")?.addEventListener("click", () => this.show());
    root.querySelector(".toast-dismiss")?.addEventListener("click", () => this.dismissToast());
    root.querySelector(".panel")?.addEventListener("keydown", this.#onKeydown as EventListener);
    this.#bindSearch();
    this.#renderBadge();
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
  --dv-good: #15803d;
  --dv-warn: #c2410c;
  --dv-radius: 10px;
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
  font: inherit; font-size: .875rem; color: inherit; background: var(--dv-bg);
  border: 1px solid var(--dv-border); border-radius: 999px; padding: .4rem .8rem; cursor: pointer;
}
.trigger:hover { border-color: var(--dv-accent); }
.trigger:focus-visible, .close:focus-visible, .panel:focus-visible, a:focus-visible { outline: 2px solid var(--dv-accent); outline-offset: 2px; }
.badge {
  min-width: 1.25rem; height: 1.25rem; padding: 0 .3rem; box-sizing: border-box; border-radius: 999px;
  background: var(--dv-accent); color: var(--dv-bg); font-size: .7rem; font-weight: 700;
  display: inline-grid; place-items: center;
}
.badge[hidden] { display: none; }
.panel {
  position: absolute; top: calc(100% + .5rem); z-index: 1000; width: min(var(--dv-width), calc(100vw - 2rem));
  max-height: min(70vh, 560px); overflow: auto; box-sizing: border-box;
  background: var(--dv-bg); color: var(--dv-fg); border: 1px solid var(--dv-border);
  border-radius: var(--dv-radius); box-shadow: 0 12px 32px rgb(0 0 0 / .14); padding: 0 1rem 1rem;
}
.panel[data-align="end"] { right: 0; }
.panel[data-align="start"] { left: 0; }
.panel[hidden] { display: none; }
header { position: sticky; top: 0; display: flex; align-items: center; justify-content: space-between; padding: .85rem 0 .5rem; background: var(--dv-bg); }
h2 { margin: 0; font-size: 1rem; }
.close { font: inherit; font-size: 1.25rem; line-height: 1; background: none; border: 0; color: var(--dv-muted); cursor: pointer; padding: .25rem .4rem; border-radius: 6px; }
.search { display: block; width: 100%; box-sizing: border-box; margin: 0 0 .25rem; font: inherit; font-size: .875rem; color: inherit; background: var(--dv-bg); border: 1px solid var(--dv-border); border-radius: 8px; padding: .45rem .65rem; }
.search:focus-visible { outline: 2px solid var(--dv-accent); outline-offset: 1px; }
.dv-release { padding: .85rem 0; border-top: 1px solid var(--dv-border); }
.dv-release[data-unread] .dv-title::after { content: ""; display: inline-block; width: .45rem; height: .45rem; margin-left: .4rem; border-radius: 50%; background: var(--dv-accent); vertical-align: middle; }
.dv-title { margin: 0; font-size: .95rem; }
.dv-meta { margin: .1rem 0 0; color: var(--dv-muted); font-size: .8rem; }
.dv-image { display: block; max-width: 100%; border-radius: 6px; margin-top: .6rem; }
.dv-summary { font-size: .875rem; }
.dv-summary p { margin: .5rem 0 0; }
.dv-entries { list-style: none; margin: .6rem 0 0; padding: 0; display: grid; gap: .4rem; font-size: .875rem; line-height: 1.45; }
.dv-type { display: inline-block; margin-right: .3rem; padding: .05rem .4rem; border-radius: 4px; font-size: .7rem; font-weight: 600; text-transform: uppercase; letter-spacing: .03em; color: var(--dv-accent); background: color-mix(in srgb, var(--dv-accent) 12%, transparent); }
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
.toast {
  position: absolute; top: calc(100% + .5rem); z-index: 999; width: min(300px, calc(100vw - 2rem)); box-sizing: border-box;
  background: var(--dv-bg); color: var(--dv-fg); border: 1px solid var(--dv-border); border-left: 3px solid var(--dv-accent);
  border-radius: var(--dv-radius); box-shadow: 0 8px 24px rgb(0 0 0 / .12); padding: .7rem .8rem; font-size: .875rem;
}
.toast[data-align="end"] { right: 0; }
.toast[data-align="start"] { left: 0; }
.toast-title { margin: 0; font-weight: 600; }
.toast-text { margin: .3rem 0 0; color: var(--dv-muted); }
.toast-actions { display: flex; align-items: center; justify-content: space-between; margin-top: .5rem; }
.toast-show { font: inherit; font-weight: 600; color: var(--dv-accent); background: none; border: 0; padding: .2rem 0; cursor: pointer; }
.toast-dismiss { font: inherit; font-size: 1.1rem; line-height: 1; color: var(--dv-muted); background: none; border: 0; padding: .2rem .4rem; border-radius: 6px; cursor: pointer; }
.toast-show:focus-visible, .toast-dismiss:focus-visible { outline: 2px solid var(--dv-accent); outline-offset: 2px; }
@media (prefers-reduced-motion: no-preference) { .panel:not([hidden]), .toast { animation: dv-in .14s ease-out; } }
@keyframes dv-in { from { opacity: 0; transform: translateY(-4px); } }
`;
