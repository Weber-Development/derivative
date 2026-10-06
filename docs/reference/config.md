---
title: Configuration
description: derivative.config.json and CLI options.
---

`derivative build` reads `derivative.config.json` from the current directory, or the file given with `--config`. Paths in it are relative to the file. CLI options override it.

```json
{
  "source": "changelog",
  "changelog": "CHANGELOG.md",
  "title": "Acme changelog",
  "link": "https://acme.ch/changelog",
  "limit": 30,
  "lang": "de",
  "out": {
    "json": "public/changelog.json",
    "atom": "public/changelog.xml",
    "jsonFeed": "public/feed.json",
    "html": "public/changelog.html"
  },
  "atomUrl": "https://acme.ch/changelog.xml",
  "jsonFeedUrl": "https://acme.ch/feed.json",
  "highlights": {}
}
```

| Key | CLI | Default | Meaning |
|---|---|---|---|
| `source` | `--source` | `changelog` if the file exists, else `github` if `repo` is set, else `gitlab` if `project` is set, else `git` | Where releases come from |
| `repo` | `--repo` | | github: `owner/name`, uses `GITHUB_TOKEN` when set |
| `project` | `--project` | | gitlab: project path (`group/name`) or numeric id, uses `GITLAB_TOKEN` when set |
| `gitlabUrl` | `--gitlab-url` | `https://gitlab.com` | gitlab: base URL of a self-managed instance |
| `includePrereleases` | `--prereleases` | `false` | github, gitlab: keep pre-releases (GitLab: upcoming releases) |
| `packages` | `--package` (repeatable) | all | Monorepos: keep only these packages, a trailing `*` matches a prefix |
| `excludePackages` | `--exclude-package` (repeatable) | none | Monorepos: drop these packages, applied after `packages` |
| `changelog` | `--changelog` (repeatable) | `CHANGELOG.md` | One path or a list for monorepos |
| `tagPattern` | `--tag-pattern` | tags containing a version | git: regular expression for release tags |
| `types` | | `feat`, `fix`, `perf`, `security`, `deprecate`, `revert` | git: commit type → entry type |
| `commitUrl` | `--commit-url` | | git: link template, `{hash}` is replaced |
| `includeUnreleased` | `--unreleased` | `false` | Keep unreleased changes |
| `title` | `--title` | | Feed and page title |
| `link` | `--link` | | URL of the full changelog, used by the widget's "All changes" link |
| `limit` | `--limit` | all | Keep the newest n releases |
| `lang` | `--lang` | `en` | Labels and dates in the Atom feed and HTML page |
| `out.json` | `--out` | `public/changelog.json` | |
| `out.atom` | `--atom` | | Atom feed |
| `out.jsonFeed` | `--json-feed` | | [JSON Feed 1.1](https://jsonfeed.org), one item per release with HTML content |
| `out.html` | `--html` | | Standalone HTML page |
| `atomUrl` | | | Public URL of the Atom file (its `rel="self"` link) |
| `jsonFeedUrl` | | | Public URL of the JSON Feed file (its `feed_url`) |

`derivative init` writes a starting config for the current project: `changelog` as source if a `CHANGELOG.md` or `.changeset` folder exists, otherwise `git`, and `changelog.json` plus `changelog.xml` in `public/` (or `static/` for SvelteKit).
| `highlights` | | | See [Highlights](../guides/highlights.md) |
