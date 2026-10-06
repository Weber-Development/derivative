---
title: Upgrading
description: What changed on the way to 1.0 and what to check when you update.
---

Derivative 1.0 changes nothing compared with 0.9: it is the release in which the [stability promise](../reference/stability.md) starts. If you are on 0.9, update the packages and you are done. If you are on an older 0.x version, this page lists the changes that could be visible in an existing installation. Everything else was added without changing existing behaviour.

## Update

```sh
pnpm up @sweberdev/derivative @sweberdev/derivative-react @sweberdev/derivative-vue
pnpm up @weber-development/derivative-insights @weber-development/derivative-segments @weber-development/derivative-announce
```

Keep the Pro packages and the core package on the same minor version. After updating, run `derivative build` once and open your page.

## Changes that can be visible

| Version | Change | What to check |
|---|---|---|
| 0.6.0 | Inline lists start with `h2` headings instead of `h3`; the panel keeps `h3` under its `h2` | If your page outline or CSS depends on the inline headings, set `heading-level="3"` (React: `headingLevel={3}`, Vue: `:heading-level="3"`) |
| 0.6.0 | `--package` and `--exclude-package` filter monorepo feeds | Only matters if you start using them |
| 0.7.0 | Type badges for Breaking, Security and Fixed are darker in light mode (WCAG AA) | If you overrode `--dv-warn` or `--dv-good`, your values still win |
| 0.7.0 | The panel and the toast are positioned with logical properties | On `dir="rtl"` pages they now open from the correct side. `align="start"` and `align="end"` follow the reading direction |
| 0.8.0 | New custom properties and parts, with defaults equal to the old look | Nothing to do; existing styles keep working |
| 0.9.0 | React and Vue get the `headingLevel` prop; the React package also exports the types `Feed`, `Release`, `EntryType` and `Messages`; Node 20 is declared in `engines` | Nothing to do on Node 20 or newer. Node 18 is no longer supported |

## Pro licences

Existing licences work with 1.0 unchanged, and Pro keeps its price. Your stored Insights events stay readable: the event format only gained optional fields (`react`, `value`, `replaces`) and was never changed.

## Something broke?

Pin the previous version, open an issue on [GitHub](https://github.com/Weber-Development/derivative/issues) with the old and new output, and we will treat anything that is covered by the stability promise as a bug.
