# @sweberdev/derivative-vue

## 0.7.0

### Minor Changes

- 5df7a41: Real-browser tests (Chromium via playwright-core) check layout, colour contrast, focus, search and reduced motion, and found two things that jsdom could not: type badges in light mode (breaking, security, fix) had a contrast of about 4.2:1 and are now darker (WCAG AA 4.5:1), and the panel and toast ignored right-to-left pages and opened off-screen. They now use logical properties. Four example projects (Vite, Next.js, SvelteKit, Astro) are built in CI.

### Patch Changes

- Updated dependencies [5df7a41]
  - @sweberdev/derivative@0.7.0

## 0.6.0

### Minor Changes

- c0f9522: GitLab Releases as a source (`--source gitlab --project group/name`, self-managed instances too), a package filter for monorepos (`--package`, `--exclude-package` and the widget attribute `package`), and a `heading-level` attribute: inline lists now start at `h2` so the heading outline stays in order, which axe tests in the suite now enforce.

### Patch Changes

- Updated dependencies [c0f9522]
  - @sweberdev/derivative@0.6.0

## 0.5.0

### Minor Changes

- cad0958: New package `@sweberdev/derivative-vue` with a `<WhatsNew>` component and a `useChangelog` composable for Vue 3 and Nuxt, a guide for Svelte, and a `derivative-render` event on the widget for extensions such as Pro reactions.

### Patch Changes

- Updated dependencies [cad0958]
  - @sweberdev/derivative@0.5.0
