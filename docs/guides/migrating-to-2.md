---
title: Migrating to 2.0
description: What breaks when you update from 1.x to 2.0, and how to fix it in a few minutes.
---

Derivative 2.0 turns the widget from a list of changes into a way to talk to readers: a richer feed format, a modal and a banner for the releases that matter, audiences, translations and hints inside your product, and read-only sources for Linear, Jira and Notion. The Pro packages add an approval workflow and drafts. Most installations need one search-and-replace.

1.x keeps getting security and bug fixes for 12 months after 2.0.0.

## Checklist

1. Node.js 22 or newer for the CLI, the `node` entry point and the Pro packages (Node 20 reached its end of life). The widget in the browser is not affected.
2. Update all packages together: `@sweberdev/derivative`, `-react` and `-vue` (and the three Pro packages) to `2`.
3. Rename the `announce` attribute to `highlight` (React and Vue: the `announce` prop to `highlight`). The `derivative-announce` event is now `derivative-highlight`, and `dismissToast()` is `dismissHighlight()`.
4. If you style the toast with `::part()`, rename `toast` to `highlight`, `toast-title` to `highlight-title`, `toast-action` to `highlight-action` and `toast-dismiss` to `highlight-dismiss`. The CSS custom properties stay the same.
5. Replace `image` by `media` in your highlights and hand-written feeds (see below).
6. If you read `changelog.json` yourself, expect `"version": 2`.
7. Run `derivative build`, open the page and click through the widget.

## What changed

| 1.x | 2.0 |
|---|---|
| `<derivative-widget announce>` | `<derivative-widget highlight>` (a toast, as before). `highlight="banner"` and `highlight="modal"` are new |
| Event `derivative-announce` | `derivative-highlight` |
| `dismissToast()` | `dismissHighlight()` |
| Parts `toast`, `toast-title`, `toast-action`, `toast-dismiss` | `highlight`, `highlight-title`, `highlight-action`, `highlight-dismiss` |
| Release field `image: "/a.png"` | `media: [{ "type": "image", "url": "/a.png", "alt": "…" }]`. A feed with `image` is still read and converted |
| `Highlights` accept `title`, `summary`, `image` | They accept `title`, `summary`, `media`, `links`, `importance` and `audience`. `image` is no longer part of the type; an `image` in a config file is still read and converted |
| `Feed.version: 1`, `createFeed` writes 1 | `Feed.version: 2`. `createFeed` writes 2 (`{ format: 1 }` for 1) |
| `parseFeed` returns the feed as written | It returns format 2 for both formats |
| Node.js 20 | Node.js 22 |

Nothing else was removed: no 1.x export was marked deprecated, so there is nothing to clean up.

## Both formats side by side

Format 2 is a superset of format 1. The new widget reads both. An old widget (1.x) reads format 2 files as long as nothing in them needs the new fields, but it rejects the version number. If pages with an old widget cache the feed (a CDN, a service worker), roll out in this order:

1. Update the widget in your app to 2.0.
2. Then switch the feed: `derivative build` writes format 2.

Or keep writing format 1 for a while: `derivative build --feed-format 1` (`"feedFormat": 1` in the config) converts the result. The first image becomes `image`; media, links, audiences, translations and importance are left out.

## What is new, and optional

- **Highlights**: `highlight="banner"` and `highlight="modal"`, `importance: "major"`. See [the widget guide](widget.md#highlight).
- **Audiences**: `audience="pro"` on the widget, `audience` in the feed. [Details](widget.md#audiences).
- **Translations**: titles, summaries and entry texts per language in the feed. [Details](../reference/feed.md).
- **Hints**: `hints` and `target` mark the page elements an entry is about. [Details](widget.md#hints-in-the-page).
- **Sources**: Linear, Jira and Notion, beta. [Details](sources.md).
- **Pro**: drafts with review and scheduled publishing, AI drafts from commits and tickets, translations and audiences in the new format. [Details](../pro/segments.md).

## Pro licences

Existing licences and prices carry over to 2.0. Update the three Pro packages to `2` together with the core package. Stored Insights events and subscriber lists keep their format.
