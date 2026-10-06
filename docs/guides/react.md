---
title: React
description: WhatsNew, useChangelog and ChangelogList.
---

```sh
pnpm add @sweberdev/derivative @sweberdev/derivative-react
```

## WhatsNew

The web component as a React component, for React 18 and 19. The package is marked `"use client"`, so it can be placed directly in a Next.js App Router layout.

```tsx
import { WhatsNew } from "@sweberdev/derivative-react";

export function Header() {
  return (
    <header>
      <Logo />
      <WhatsNew src="/changelog.json" lang="de" onOpen={() => track("whats-new-open")} />
    </header>
  );
}
```

Props match the [widget attributes](widget.md) in camelCase (`storageKey`), with `types` as an array (`types={["feature", "fix"]}`) and `announce` and `search` as booleans, `packages` as an array (`packages={["@acme/web"]}`), plus `feed`, `messages`, `icon`, `className`, `style`, `onOpen` and `onRead`.

## useChangelog

Build your own UI, for example a dot on an existing menu item:

```tsx
import { useChangelog } from "@sweberdev/derivative-react";

function HelpMenuItem() {
  const { unread, markAllRead } = useChangelog({ src: "/changelog.json" });
  return (
    <a href="/changelog" onClick={markAllRead}>
      Changelog {unread.length > 0 && <span className="dot" aria-label={`${unread.length} new`} />}
    </a>
  );
}
```

It returns `status` (`loading`, `ready`, `error`), `feed`, `releases`, `unread`, `error` and `markAllRead`. Storage is read after mount, so server and client render the same markup.

## ChangelogList

Unstyled HTML for a full changelog page, with `dv-` class names:

```tsx
import { readFile } from "node:fs/promises";
import { parseFeed } from "@sweberdev/derivative";
import { ChangelogList } from "@sweberdev/derivative-react";

export default async function ChangelogPage() {
  const feed = parseFeed(JSON.parse(await readFile("public/changelog.json", "utf8")));
  return <ChangelogList releases={feed.releases} lang="de" />;
}
```
