# @sweberdev/derivative-react

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
