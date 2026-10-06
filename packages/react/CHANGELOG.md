# @sweberdev/derivative-react

## 0.9.0

### Minor Changes

- b02f634: Release candidate for 1.0: the public API is frozen and a test fails when an export is added, removed or renamed without updating the API reference. The reference now lists every export, including the GitLab helpers. New pages "Stability" (what is covered, deprecation policy, supported environments) and "Upgrading" (changes that can be visible since 0.x). React and Vue gain the `headingLevel` prop that the widget has had since 0.6, React re-exports the `Feed`, `Release`, `EntryType` and `Messages` types like Vue, and `engines` declares Node 20. `pnpm rc` packs the packages like a release does and builds the examples from the tarballs, also in CI.

### Patch Changes

- Updated dependencies [b02f634]
  - @sweberdev/derivative@0.9.0

## 0.8.0

### Minor Changes

- 02383dc: Theming polish: new custom properties `--dv-button-radius`, `--dv-button-bg`, `--dv-button-fg`, `--dv-badge-fg`, `--dv-shadow`, `--dv-max-height` and `--dv-z`, and `::part()` hooks for the header, title, close button, search field, releases, entries, badges, scopes, entry links and the toast. The guide gains a dark mode recipe for apps with their own switch and a note on right-to-left pages, and the browser tests now cover theming and the RTL toast.

### Patch Changes

- Updated dependencies [02383dc]
  - @sweberdev/derivative@0.8.0

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

## 0.4.0

### Minor Changes

- b20427a: Search field in the panel: `<derivative-widget search>` (React: `search`) filters releases as you type across version, title, summary, entries, details and scope. Texts for en, de, fr and it.

### Patch Changes

- Updated dependencies [b20427a]
  - @sweberdev/derivative@0.4.0

## 0.3.0

### Minor Changes

- a91fe97: `derivative init` sets up `derivative.config.json` and the build script in one step, and `--json-feed` writes a JSON Feed 1.1 next to the Atom feed.

### Patch Changes

- Updated dependencies [a91fe97]
  - @sweberdev/derivative@0.3.0

## 0.2.0

### Minor Changes

- 32bb03b: GitHub Releases as a source (`--source github --repo owner/name`), an `announce` toast for the newest titled release, and a `types` filter for the widget.

### Patch Changes

- Updated dependencies [32bb03b]
  - @sweberdev/derivative@0.2.0

## 0.1.0

### Minor Changes

- 3febc27: First release: changelog feed from Changesets, CHANGELOG.md or conventional commits, `derivative build` CLI with JSON, Atom and HTML output, the `<derivative-widget>` web component with unread badge (EN, DE, FR, IT) and React bindings.

### Patch Changes

- Updated dependencies [3febc27]
  - @sweberdev/derivative@0.1.0
