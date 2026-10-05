---
title: API
description: Functions exported by @sweberdev/derivative.
---

## `@sweberdev/derivative`

Runs in browsers and Node.

| Export | Purpose |
|---|---|
| `parseChangelog(markdown, options?)` | Releases from a `CHANGELOG.md` (Changesets, Keep a Changelog, conventional-changelog) |
| `parseCommits(commits, options?)` | Releases from conventional commits with tags |
| `parseGitHubReleases(releases, options?)` | Releases from the GitHub Releases API response |
| `createFeed(releases, options?)` | Sorts, merges, applies highlights and limit |
| `parseFeed(json)` | Validates untrusted JSON |
| `getUnread(feed, lastSeen, options?)` | Releases the reader hasn't seen |
| `latestKey(feed)`, `releaseKey(release)` | Keys stored as "last seen" |
| `createStore(key?)` | Safe `localStorage` wrapper |
| `renderReleases(releases, options?)` | HTML fragment |
| `renderPage(feed, options?)` | Complete HTML page |
| `renderAtom(feed, options?)` | Atom XML |
| `inlineMarkdown(text)`, `blockMarkdown(text)`, `escapeHtml(text)` | Safe Markdown subset |
| `getMessages(lang?, overrides?)`, `formatDate(date, lang?)` | Labels and dates |
| `compareVersions(a, b)`, `versionFromTag(tag)` | Version helpers |

## `@sweberdev/derivative/node`

| Export | Purpose |
|---|---|
| `buildFeed(config?, cwd?)` | Same as `derivative build`, returns the feed |
| `writeOutputs(feed, config, cwd?)` | Writes JSON, Atom and HTML |
| `readGitCommits(cwd?, range?)` | Commits with tags, newest first |
| `readTagDate(version, package?, cwd?)` | Date of a release tag |
| `readGitHubReleases(repo, options?)` | Published releases from the GitHub API, newest first |
| `loadConfig(path)` | Reads `derivative.config.json` |

## `@sweberdev/derivative/widget`

Registers `<derivative-widget>` on import. `@sweberdev/derivative/widget/define` exports `DerivativeWidget` and `defineDerivativeWidget(tagName?)` without registering.
