# Derivative

Self-hosted changelog and "What's new" widget. Derivative turns your Changesets output, `CHANGELOG.md` or conventional commits into a static `changelog.json`, an Atom feed and a changelog page, and shows it in your app behind a button with an unread badge. No SaaS, no tracking, no cookie.

```sh
pnpm add @sweberdev/derivative
npx derivative build            # writes public/changelog.json
```

```html
<derivative-widget src="/changelog.json" lang="de"></derivative-widget>
<script type="module">
  import "@sweberdev/derivative/widget";
</script>
```

| Package | |
|---|---|
| [`@sweberdev/derivative`](https://github.com/Weber-Development/derivative/tree/main/packages/core) | Parsers, `derivative build` CLI, renderers, `<derivative-widget>` |
| [`@sweberdev/derivative-react`](https://github.com/Weber-Development/derivative/tree/main/packages/react) | `<WhatsNew>`, `useChangelog`, `<ChangelogList>` |

- Reads Changesets (default and GitHub formats), Keep a Changelog, conventional-changelog and conventional commits with tags
- Web component of about 6 kB gzipped: popover or inline, keyboard and screen reader support, dark mode, EN, DE, FR, IT
- Unread state in `localStorage`, nothing leaves the browser
- Highlights: titles, summaries and images for the releases that matter
- Atom feed, JSON Feed and a standalone HTML page from the same data
- `derivative init` sets up config and build script in one step

Docs and live demo: [packages.sweber.dev/derivative](https://packages.sweber.dev/derivative)

## Development

```sh
pnpm install
pnpm build && pnpm test && pnpm lint
```

Releases run through Changesets: add a changeset with `pnpm changeset`, merge the "version packages" PR, and the release workflow publishes to npm.

## License

MIT
