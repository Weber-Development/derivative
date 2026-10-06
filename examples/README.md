# Examples

Four small projects that show the widget in a real framework. Each one reads its `CHANGELOG.md`, writes `changelog.json` before the build and embeds `<derivative-widget>`.

| Folder | Framework | How the widget is added |
|---|---|---|
| [`vite`](vite) | Vite | web component, imported in `src/main.ts` |
| [`nextjs`](nextjs) | Next.js 15, App Router | `WhatsNew` from `@sweberdev/derivative-react` |
| [`sveltekit`](sveltekit) | SvelteKit, Svelte 5 | web component, imported in `onMount` |
| [`astro`](astro) | Astro 5 | web component, imported in a page `<script>` |

They are standalone: copy a folder, run `pnpm install` and `pnpm dev`. They are not part of this repository's workspace, and CI builds all four against the published package so an example never rots.
