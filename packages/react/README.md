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
- Atom feed and a standalone HTML page from the same data

Docs and live demo: [packages.sweber.dev/derivative](https://packages.sweber.dev/derivative)

## Development

```sh
pnpm install
pnpm build && pnpm test && pnpm lint
```

Releases run through Changesets: add a changeset with `pnpm changeset`, merge the "version packages" PR, and the release workflow publishes to npm.

## License

MIT

<!-- pro-promo -->
## Derivative Pro

Need more than the free package? **Derivative Pro** adds:

- Insights: opens, reads, link clicks and a helpful / not helpful vote per release, on your own endpoint
- Segments: entries per plan or role, scheduled releases, translations, drafts with approval
- Announce: double opt-in subscriber list, e-mail digests, and posts to Slack, Teams, Discord, Mastodon, Bluesky and more

Subscriptions from CHF 12 per month, or a one-time lifetime licence. [See what is included](https://packages.sweber.dev/derivative?utm_source=npm&utm_medium=readme&utm_campaign=pro)
