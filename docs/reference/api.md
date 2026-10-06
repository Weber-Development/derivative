---
title: API
description: Every export of @sweberdev/derivative, its React and Vue bindings and the widget.
---

Everything on this page is covered by the [stability promise](stability.md). A test fails when an export is added, removed or renamed without this page being updated.

## `@sweberdev/derivative`

Runs in browsers and Node.

| Export | Purpose |
|---|---|
| `parseChangelog(markdown, options?)` | Releases from a `CHANGELOG.md` (Changesets, Keep a Changelog, conventional-changelog) |
| `parseCommits(commits, options?)` | Releases from conventional commits with tags |
| `parseGitHubReleases(releases, options?)` | Releases from the GitHub Releases API response |
| `parseGitLabReleases(releases, options?)` | Releases from the GitLab Releases API response |
| `createFeed(releases, options?)` | Sorts, merges, applies highlights and limit |
| `parseFeed(json)` | Validates untrusted JSON |
| `sortReleases(releases)` | Newest first, by version and date |
| `getUnread(feed, lastSeen, options?)` | Releases the reader hasn't seen |
| `latestKey(feed)`, `releaseKey(release)` | Keys stored as "last seen" |
| `createStore(key?)` | Safe `localStorage` wrapper |
| `renderReleases(releases, options?)` | HTML fragment |
| `renderPage(feed, options?)` | Complete HTML page |
| `renderAtom(feed, options?)` | Atom XML |
| `renderJsonFeed(feed, options?)` | JSON Feed 1.1 |
| `inlineMarkdown(text)`, `blockMarkdown(text)`, `escapeHtml(text)` | Safe Markdown subset |
| `getMessages(lang?, overrides?)`, `formatDate(date, lang?)`, `messages` | Labels and dates in `en`, `de`, `fr`, `it` |
| `compareVersions(a, b)`, `versionFromTag(tag)` | Version helpers |
| `DEFAULT_COMMIT_TYPES` | Default mapping of conventional commit types to entry types |
| `ENTRY_TYPES` | The entry types, in display order |

Types: `Feed`, `Release`, `Entry`, `EntryType`, `Highlights`, `Locale`, `Messages`, `Commit`, `GitHubRelease`, `GitLabRelease`, `CreateFeedOptions`, `ParseChangelogOptions`, `ParseCommitsOptions`, `ParseGitHubReleasesOptions`, `RenderOptions`, `UnreadOptions`.

## `@sweberdev/derivative/node`

| Export | Purpose |
|---|---|
| `buildFeed(config?, cwd?)` | Same as `derivative build`, returns the feed |
| `writeOutputs(feed, config, cwd?)` | Writes JSON, Atom and HTML |
| `readGitCommits(cwd?, range?)` | Commits with tags, newest first |
| `readTagDate(version, package?, cwd?)` | Date of a release tag |
| `readGitHubReleases(repo, options?)` | Published releases from the GitHub API, newest first |
| `readGitLabReleases(project, options?)` | Releases from GitLab, including self-managed instances |
| `matchesPackage(name, patterns)` | The package filter of `--package`: exact names and trailing `*` |
| `loadConfig(path)` | Reads `derivative.config.json` |
| `init(cwd?, { scripts? })`, `detectConfig(cwd)` | Same as `derivative init` |
| `CONFIG_FILE` | `"derivative.config.json"` |

Types: `DerivativeConfig`, `InitResult`.

## `@sweberdev/derivative/widget`

Registers `<derivative-widget>` on import. `@sweberdev/derivative/widget/define` exports `DerivativeWidget` and `defineDerivativeWidget(tagName?)` without registering. Attributes, events, properties, custom properties and parts are listed in the [widget guide](../guides/widget.md).

## `@sweberdev/derivative-react`

| Export | Purpose |
|---|---|
| `WhatsNew` | The widget as a component, a client component for Next.js |
| `useChangelog(options)` | Feed, unread releases and `markAllRead` for your own UI |
| `ChangelogList` | Unstyled list of releases |

Types: `WhatsNewProps`, `ChangelogListProps`, `UseChangelogOptions`, `ChangelogState`, plus `Feed`, `Release`, `EntryType` and `Messages` re-exported from the core package.

## `@sweberdev/derivative-vue`

| Export | Purpose |
|---|---|
| `WhatsNew` | The widget as a Vue 3 component |
| `useChangelog(options)` | Reactive feed, unread releases and `markAllRead` |

Types: `UseChangelogOptions`, `ChangelogState`, plus `Feed`, `Release`, `EntryType` and `Messages`.

## CLI

`derivative init` and `derivative build`, with the options in the [configuration reference](config.md). Exit code 0 means success, 1 an error that is printed to stderr and 2 a usage mistake.
