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
    "html": "public/changelog.html"
  },
  "atomUrl": "https://acme.ch/changelog.xml",
  "highlights": {}
}
```

| Key | CLI | Default | Meaning |
|---|---|---|---|
| `source` | `--source` | `changelog` if the file exists, else `git` | Where releases come from |
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
| `out.html` | `--html` | | Standalone HTML page |
| `atomUrl` | | | Public URL of the Atom file (its `rel="self"` link) |
| `highlights` | | | See [Highlights](../guides/highlights.md) |
