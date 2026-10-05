---
title: Introduction
description: What Derivative is and when to use it.
---

Derivative turns the changelog you already keep into a "What's new" widget for your app. It reads Changesets output, any `CHANGELOG.md` in the Keep a Changelog or conventional-changelog style, or your conventional commits and tags, and writes a static `changelog.json`. A small web component shows it behind a button with an unread badge.

There is no service behind it. The feed is a file you deploy with your app, the widget remembers what a reader has seen in `localStorage`, and nothing is sent anywhere. That makes it a fit where hosted tools such as Beamer or Headway are not: apps with strict privacy requirements, internal tools, and products that simply don't want another subscription and another cookie banner entry.

## What you get

- **`derivative build`**: a CLI that writes `changelog.json`, and optionally an Atom feed and a standalone HTML changelog page.
- **`<derivative-widget>`**: a framework-free web component (about 6 kB gzipped) with a popover and an inline mode, keyboard support, dark mode and labels in English, German, French and Italian.
- **`@sweberdev/derivative-react`**: a `<WhatsNew>` component, a `useChangelog` hook for your own UI and an unstyled `<ChangelogList>`.
- **Highlights**: give a release a title, a short summary and an image without touching the generated entries.

## How it fits together

```text
CHANGELOG.md / git tags ──derivative build──▶ public/changelog.json ──▶ <derivative-widget>
                                         └──▶ public/changelog.xml (Atom)
                                         └──▶ public/changelog.html
```

Continue with [Getting started](getting-started.md).
