---
title: Stability
description: What stays the same from 1.0, how deprecations work and which environments are supported.
---

From 1.0, Derivative follows [semantic versioning](https://semver.org). A minor or patch release never breaks what this page lists as covered. The core package, the React and Vue bindings, and the Pro packages are released together, so one version number tells you what you have.

## What is covered

- **Exports** of every entry point in the [API reference](api.md), their names, signatures and documented behaviour. A test in the repository fails when an export is added, removed or renamed without updating the reference.
- **The CLI**: commands, options and exit codes (`0` success, `1` error, `2` usage mistake), and the keys of `derivative.config.json`.
- **The feed format**: `changelog.json` with `"version": 1`. New optional fields can appear, existing fields keep their meaning. A future incompatible format would use `"version": 2` and be read next to version 1 for at least one major release.
- **The widget**: attributes, properties, methods, events and their `detail`, CSS custom properties (`--dv-*`) and `::part()` names. Slots (`icon` and the default label slot) too.
- **Pro**: the exports, CLI options and environment variables documented in the Pro guides, and the stored event format of Insights, so existing data stays readable.

## What is not

- The shadow DOM's inner structure and class names. Style through custom properties and parts, not through selectors that reach inside.
- The exact English wording of default labels, the exact HTML of the generated changelog page and the Atom feed layout, and the pixel values of the default design. They can improve in a minor release; use `messages`, parts and properties to pin what matters to you.
- Anything not mentioned in the guides or the API reference.

## Deprecations

A feature is never removed without notice. It is first marked as deprecated in the changelog and the documentation in a minor release, keeps working for at least one more minor release, and is removed no earlier than the next major release. Deprecated CLI options and config keys print a one-line warning to stderr.

## Supported environments

| | |
|---|---|
| Node.js | 20 and newer, for the CLI, `@sweberdev/derivative/node` and the Pro packages. Support for a Node version ends when it reaches its end of life, in a minor release that is announced in the changelog. |
| Browsers | Current versions of Chrome, Edge, Firefox and Safari, which means custom elements, shadow DOM, `color-mix()` and logical CSS properties. |
| React | 18 and 19 |
| Vue | 3 |
| Package formats | ESM and CommonJS with TypeScript types, checked with `@arethetypeswrong/cli` in CI |

## Security fixes

Security fixes go into the latest minor release as a patch. The advisory is named in the changelog, so you can see what you are updating for.
