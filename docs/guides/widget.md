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
| `announce` | off | Shows a small toast for the newest unread release that has a title, once per release |
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
| `derivative-announce` | `{ release }`, when the toast appears |

Methods: `show()`, `hide()`, `toggle()`, `markAllRead()`, `dismissToast()`. Properties: `open`, `unreadCount`.

## Announcement toast

With `announce`, the widget shows a small toast next to the button for the newest unread release that has a `title` (set one in [Highlights](highlights.md) or as the GitHub release name). It contains the title, the first paragraph of the summary, and "Show" and "Dismiss" buttons. Each release is announced only once per reader; dismissing it keeps the unread badge, "Show" opens the panel. Patch releases without a title never interrupt anyone.

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

Also available: `--dv-bg`, `--dv-fg`, `--dv-muted`, `--dv-border`, `--dv-good`, `--dv-warn`. For deeper changes, the parts `button`, `badge`, `panel`, `list`, `link` and `toast` can be styled with `::part()`. Replace the bell icon with `<span slot="icon">…</span>` and the label with plain text content.

## Accessibility

The button reports its state with `aria-expanded` and announces the number of new releases to screen readers. The panel is a labelled dialog that receives focus when it opens. Escape closes it and returns focus to the button, as does a click outside. The toast is a `role="status"` region, so screen readers announce it without moving focus. The opening animation is skipped when the reader prefers reduced motion.

## Security

Feed text is always escaped. Only `code`, **bold**, *italic* and links are rendered, and links with schemes other than `http`, `https` and `mailto` are dropped.
