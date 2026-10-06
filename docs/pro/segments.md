---
title: Segments
description: Entries for certain plans or roles, and scheduled releases.
---

`@weber-development/derivative-segments` decides which entries each reader sees.

## Mark entries

Add a marker at the end of an entry in your changelog:

```md
- Export invoices to DATEV [for: pro]
- New audit view for owners [for: admin, owner]
```

The marker is removed from the text. Entries without a marker are visible to everyone.

## Rules

Rules apply audiences without touching the changelog. Every matching rule adds its audiences.

```json
{
  "rules": [
    { "match": { "scope": "billing" }, "audience": ["admin"] },
    { "match": { "release": "3.0.0" }, "audience": ["beta"] },
    { "match": { "type": "feature", "text": "datev|bexio" }, "audience": ["pro"] }
  ],
  "schedule": { "3.2.0": "2026-11-01T08:00:00+01:00" }
}
```

`match` accepts `release` (a release key), `scope`, `type` and `text` (a case-insensitive
regular expression). A rule with only `release` applies to the whole release. A scheduled release
stays hidden until its time and then shows that time as its date.

## One feed per user

```ts
import { createFeedHandler } from "@weber-development/derivative-segments";

export const GET = createFeedHandler({
  feed: () => readFeed(),
  rules,
  viewer: async (request) => ({ audiences: (await getSession(request))?.roles ?? [] }),
});
```

Set the widget's `src` to this route. Responses carry `cache-control: private, no-cache` so a
shared cache never serves one user's feed to another.

## Translations

Publish the changelog in more languages. `translate` sends the titles, summaries and entries of a
feed to a translation provider with your own API key and writes one feed per language:

```sh
export DERIVATIVE_TRANSLATE_KEY=...      # your provider key, never committed
npx derivative-segments translate --feed public/changelog.json --to de,fr,it --provider deepl --keep "Acme"
```

| Option | |
|---|---|
| `--provider` | `deepl`, `openai` (any OpenAI-compatible endpoint) or `anthropic`. |
| `--model` | Required for `openai` and `anthropic`. |
| `--base-url` | Endpoint of an OpenAI-compatible service, for example a local Ollama (`http://localhost:11434/v1`). |
| `--from` | Language of the feed. Default: the provider detects it. |
| `--formality` | DeepL only: `more` or `less`. |
| `--keep` | Comma-separated terms that stay as they are, such as product names. |
| `--cache` | File that remembers translations. Default `.derivative-translations.json`. |
| `--out-dir` | Where `changelog.<lang>.json` is written. Default `public`. |
| `--dry-run` | Shows how many texts and characters would be sent and calls nothing. |

Ids, versions, dates, scopes and links never change. Inline code, link targets, URLs and the `--keep`
terms are protected, so a translation cannot break them. If a text's protected parts come back
damaged, that text keeps its original wording, is not cached, and the command exits with 1, so CI
notices and the next run tries again.

Commit the cache file: a run then sends only new or changed texts, which keeps the cost per release
close to zero. The file is plain JSON, so you can correct single sentences by hand. Machine
translation is good but not perfect, so have the languages that matter to you read over the first
run. Point the widget at the file for the reader's language:

```html
<derivative-widget src="/changelog.de.json" lang="de"></derivative-widget>
```

In code, `translateFeed(feed, { to, translator, cache, keep })` returns the translated feed and
`stats` (`translated`, `cached`, `fallback`, `characters`). The translators are `deeplTranslator`,
`openAiTranslator` and `anthropicTranslator`; a translator is one function, so another provider is
a few lines. Your texts go to the provider you choose, under your account and its terms.

## Feature flags

Tie entries to the flags you already use. Mark an entry with the flag key, `Export to DATEV [for: datev-export]`, and pass a flag provider to the handler. Users who have the flag on see the entry, everyone else does not:

```ts
import { createFeedHandler, unleashFlags } from "@weber-development/derivative-segments";

const flags = unleashFlags({ url: "https://unleash.acme.example", token: process.env.UNLEASH_FRONTEND_TOKEN! });

export const GET = createFeedHandler({
  feed: () => loadFeed(),
  rules,
  viewer: async (request) => {
    const session = await getSession(request);
    return { userId: session?.id, audiences: session?.roles ?? [] };
  },
  flags,
});
```

`unleashFlags({ url, token })` reads the Unleash frontend API, `launchDarklyFlags({ clientSideId })` the LaunchDarkly client-side API (boolean flags that evaluate to `true`). Any function `(context) => Promise<string[]>` works too, for example one that reads your own table. Flags are added to the viewer's audiences, so they combine with roles and rules. Results are cached for 30 seconds per user (`cacheSeconds` changes it, `0` turns it off). If the provider is down, the feed is served without flagged entries instead of failing. Pass `flagContext: (request, viewer) => ({ userId, properties: { plan: "pro" } })` to hand extra targeting properties to the provider. Keep the keys of unreleased features out of public feeds: as with all segments, this filters what is shown, it is not access control.

## Static sites

```sh
npx derivative-segments split --feed public/changelog.json --rules segments.json --out-dir public/feeds
```

This writes one feed per audience, for example `public/feeds/pro.json`, and
`public/feeds/public.json` for anonymous visitors. Each audience feed also contains the entries
meant for everyone.

Segments filter what is shown. They are not access control: anyone who can fetch a feed can read
all of it, so keep confidential text out of feeds that are publicly reachable.
