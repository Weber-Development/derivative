---
title: Sources
description: Changesets, CHANGELOG.md formats and conventional commits.
---

Derivative picks the source automatically: if `CHANGELOG.md` exists it reads that file, otherwise it reads git. Set `--source changelog` or `--source git` to choose explicitly.

## Changesets

The default and the `@changesets/changelog-github` formats are both understood. Headings map to entry types:

| Heading | Type in the widget |
|---|---|
| Major Changes | Breaking |
| Minor Changes | New |
| Patch Changes | Fixed |

Commit hashes and "Thanks @user!" prefixes are removed, the pull request link is kept. "Updated dependencies" entries are left out. Changesets writes no dates, so Derivative looks up the matching git tag (`v1.2.0`, `1.2.0` or `@scope/pkg@1.2.0`) and uses its date.

In a monorepo, pass each package changelog. Every release then carries its package name:

```sh
npx derivative build --changelog packages/app/CHANGELOG.md --changelog packages/sdk/CHANGELOG.md
```

## Keep a Changelog and conventional-changelog

`## [1.2.0] - 2026-10-01` and `## [1.2.0](compare-url) (2026-10-01)` headings both work. Sections map like this:

| Section | Type |
|---|---|
| Added, Features | New |
| Changed, Improvements, Performance Improvements | Improved |
| Fixed, Bug Fixes | Fixed |
| Security | Security |
| Deprecated | Deprecated |
| Removed | Removed |
| Breaking Changes | Breaking |

`## [Unreleased]` is skipped unless you pass `--unreleased`.

## Conventional commits

With `--source git`, every tag that contains a version starts a release, and the commits up to the previous tag are its entries:

| Commit | Type |
|---|---|
| `feat:` | New |
| `fix:` | Fixed |
| `perf:` | Improved |
| `security:` | Security |
| `deprecate:` | Deprecated |
| `feat!:` or a `BREAKING CHANGE:` footer | Breaking |

`chore`, `ci`, `docs`, `test`, `refactor`, `build` and `style` commits are left out because readers of a "What's new" panel don't care about them. Add `[skip changelog]` to any commit message to leave it out as well. Change the mapping with `types` in the [config](../reference/config.md).

In a monorepo with tags like `@acme/app@1.2.0`, limit releases to one package with `--tag-pattern "^@acme/app@"`. Link entries to commits with `--commit-url "https://github.com/acme/app/commit/{hash}"`.
