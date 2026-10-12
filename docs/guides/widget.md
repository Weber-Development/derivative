---
title: Widget
description: Attributes, events, styling and accessibility of <derivative-widget>.
---

```html
<derivative-widget src="/changelog.json"></derivative-widget>
<script type="module">
  import "@sweberdev/derivative/widget";
</script>
```

Importing `@sweberdev/derivative/widget` registers the element. To register it under another name, or only when you decide, import from `@sweberdev/derivative/widget/define`:

```js
import { defineDerivativeWidget } from "@sweberdev/derivative/widget/define";
defineDerivativeWidget("acme-whats-new");
```

## Attributes

| Attribute | Default | Meaning |
|---|---|---|
| `src` | | URL of `changelog.json` |
| `lang` | `<html lang>` | `en`, `de`, `fr` or `it` (regional tags such as `de-CH` work) |
| `mode` | `popover` | `inline` renders the list in place, without a button |
| `limit` | `10` | Number of releases shown |
| `label` | "What's new" | Button text and panel title |
| `href` | feed `link` | "All changes" link below the list |
| `align` | `end` | Panel opens towards the `start` or `end` of the button |
| `theme` | system | `light` or `dark` to override the system setting |
| `types` | all | Comma-separated entry types to show, e.g. `feature,fix`. Releases without a matching entry are hidden unless they have a title or summary |
| `package` | all | Monorepo feeds: show, count and mark as read only these packages. Comma-separated, a trailing `*` matches a prefix, e.g. `@acme/*` |
| `heading-level` | `3` in the panel, `2` inline | Level of the release headings, 2 to 6, so the page's heading outline stays in order |
| `highlight` | off | Announces the newest unread release that has a title, once per release: `toast` (default when the attribute is present), `banner` or `modal`. Releases with `importance: "major"` come first. See [Highlights](#highlight) |
| `audience` | none | Comma-separated audiences of the reader, e.g. `pro,admin`. Releases and entries that name an audience are hidden from everyone else; content without an audience is shown to all |
| `hints` | off | Sets `data-derivative-hint` on the page elements that unread entries point to with `target` (a CSS selector) and removes it when the reader has seen the release |
| `search` | off | Adds a search field above the list. It filters as you type across version, title, summary, entries, details and scope, and ignores `limit` while a query is active |
| `storage-key` | `derivative:last-seen` | `localStorage` key, set one per product if you embed several feeds |

Set the `feed` property instead of `src` to pass data you already have. Set `messages` to change any text.

## Events

All events bubble and cross the shadow root.

| Event | `detail` |
|---|---|
| `derivative-load` | `{ feed }` |
| `derivative-error` | `{ error }` |
| `derivative-open` | |
| `derivative-close` | |
| `derivative-read` | `{ lastSeen }` |
| `derivative-highlight` | `{ release }`, when a highlight appears |
| `derivative-render` | `{ list }`, after the list was drawn (also after each search). For extensions that add something to every release, like Pro reactions |

Methods: `show()`, `hide()`, `toggle()`, `markAllRead()`, `dismissHighlight()`. Properties: `open`, `unreadCount`.

## Highlight

With `highlight`, the widget announces the newest unread release that has a `title` (set one in [Highlights](highlights.md) or as the GitHub release name), once per reader and release. A release with `importance: "major"` wins over newer minor ones. Patch releases without a title never interrupt anyone. Dismissing a highlight keeps the unread badge; "Show" opens the panel.

| Value | Looks like |
|---|---|
| `toast` | A small card next to the button with the title and the first paragraph of the summary |
| `banner` | A bar across the top of the page with the title, the first paragraph and the buttons |
| `modal` | A centred dialog (`role="dialog"`, `aria-modal`) with the title, the whole summary, the first image and the release's links. Tab stays inside, Escape or a click on the backdrop dismisses it and focus returns to the button |

## Audiences

Mark releases or entries with `audience` in the feed ([format](../reference/feed.md)), or label tickets `audience:pro` in a tracker, and tell the widget who is reading with `audience="pro"`. Hidden content is not counted as unread. The filter runs in the browser, so use it for relevance, not for secrets: the feed file itself is public. For feeds that must not leak, [Pro Segments](../pro/segments.md) builds one feed per audience.

## Hints in the page

An entry with `"target": "#export-button"` points at the part of your product it is about. With `hints`, the widget sets `data-derivative-hint="feature"` (the entry type) on matching elements while the entry is unread. Style it as you like:

```css
[data-derivative-hint]::after {
  content: "";
  display: inline-block;
  width: .5rem;
  height: .5rem;
  margin-inline-start: .35rem;
  border-radius: 50%;
  background: #2f5bea;
}
```

The attribute disappears when the reader opens the panel (all releases count as read). Invalid selectors are ignored.

## Translations

If the feed carries `translations` (the [feed format](../reference/feed.md) describes them), the widget and the generated page use the title, summary and entry texts of the language set with `lang`, falling back to the original text.

## Search

With `search`, a search field appears above the list, in the panel and in `mode="inline"`. It filters as the reader types and matches version, title, summary, entries, details and scope, case-insensitively. While a query is active, `limit` is ignored so older releases are found too. The query stays when the panel is closed and reopened. The placeholder text is the `search` message, the empty state the `noResults` message.

## Unread badge

The widget stores the newest release a reader has seen. Releases above it count as new. A first-time reader sees releases from the last 30 days as new, so they don't get a badge for your entire history.

## Styling

Use CSS custom properties on the element:

```css
derivative-widget {
  --dv-accent: #e4002b;
  --dv-radius: 4px;
  --dv-width: 420px;
  --dv-font: "Inter", sans-serif;
}
```

Also available:

| Property | Default | Meaning |
|---|---|---|
| `--dv-bg`, `--dv-fg`, `--dv-muted`, `--dv-border` | light or dark set | Surfaces and text |
| `--dv-good`, `--dv-warn` | green, orange | Colours of Fixed and of Breaking and Security badges |
| `--dv-button-radius` | `999px` | Corner radius of the button |
| `--dv-button-bg`, `--dv-button-fg` | `--dv-bg`, inherited | Button colours |
| `--dv-badge-fg` | `--dv-bg` | Text colour of the unread badge (background is `--dv-accent`) |
| `--dv-shadow` | soft shadow | Shadow of the panel and the highlight |
| `--dv-max-height` | `min(70vh, 560px)` | Height limit of the panel |
| `--dv-z` | `1000` | Stacking order of the panel, the banner and toast sit one below, the modal one above |

For deeper changes, use `::part()`: `button`, `badge`, `panel`, `header`, `title`, `close`, `search`, `list`, `link`, `release`, `release-title`, `meta`, `summary`, `entry`, `type`, `scope`, `entry-link`, `highlight`, `highlight-title`, `highlight-text`, `highlight-action`, `highlight-dismiss`, `backdrop`, `media`, `links` and `action`.

```css
derivative-widget::part(entry) { padding-block: 0.25rem; }
derivative-widget::part(release-title) { font-family: "Space Grotesk", sans-serif; }
```

Replace the bell icon with `<span slot="icon">…</span>` and the label with plain text content.

### Dark mode

By default the widget follows the system setting. If your app has its own switch, such as a `dark` class on `<html>`, set the `theme` attribute from it instead:

```js
const widget = document.querySelector("derivative-widget");
new MutationObserver(() => {
  widget.setAttribute("theme", document.documentElement.classList.contains("dark") ? "dark" : "light");
}).observe(document.documentElement, { attributeFilter: ["class"] });
```

Or style the colour properties yourself, e.g. `.dark derivative-widget { --dv-bg: #0b0b0f; --dv-fg: #f4f4f5; }`.

### Right-to-left

Pages with `dir="rtl"` need no setting: the panel and the highlight open from the correct side, and `align="start"` and `align="end"` follow the reading direction.

## Accessibility

Colours meet the WCAG AA contrast ratio (4.5:1) in light and dark mode. Pages with `dir="rtl"` work too: the panel and highlight open from the correct side. Both are checked in real Chromium in CI. Release headings are `h3` under the panel's `h2`; inline lists start at `h2` and can be moved with `heading-level`. The widget is checked with axe in the test suite. The button reports its state with `aria-expanded` and announces the number of new releases to screen readers. The panel is a labelled dialog that receives focus when it opens. Escape closes it and returns focus to the button, as does a click outside. Toast and banner are `role="status"` regions, so screen readers announce them without moving focus; the modal is a labelled dialog that takes focus and returns it on close. The opening animation is skipped when the reader prefers reduced motion.

## Security

Feed text is always escaped. Only `code`, **bold**, *italic* and links are rendered, and links with schemes other than `http`, `https` and `mailto` are dropped.
