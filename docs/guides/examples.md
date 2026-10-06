---
title: Examples
description: Complete starter projects for Vite, Next.js, SvelteKit and Astro.
---

Four small projects in the [`examples`](https://github.com/Weber-Development/derivative/tree/main/examples) folder show the widget in a real framework. Each one reads its own `CHANGELOG.md`, writes `public/changelog.json` (or `static/` in SvelteKit) before the build, and embeds the widget with `announce` and `search`.

| Folder | Framework | How the widget is added |
|---|---|---|
| `vite` | Vite | web component, imported in `src/main.ts` |
| `nextjs` | Next.js 15, App Router | `WhatsNew` from `@sweberdev/derivative-react` in `app/layout.tsx` |
| `sveltekit` | SvelteKit, Svelte 5 | web component, imported in `onMount` |
| `astro` | Astro 5 | web component, imported in a page `<script>` |

Copy a folder, run `pnpm install` and `pnpm dev`. The examples are built against the published package on every change, so they keep working. For details see the guides for [React](react.md), [Vue](vue.md) and [Svelte](svelte.md).
