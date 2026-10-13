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

Feed [format 2](../reference/feed.md) carries audiences natively: set `audience` on an entry or a
whole release in the feed itself (for example from a [tracker label](../guides/sources.md), `audience:pro`).
It is combined with the markers and rules below; case does not matter.

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

### Translations inside the feed

With `--embed` the languages go into one feed instead of one file per language. Each release gets
`translations.<lang>` (title, summary, entry texts) and entries get stable ids. The widget and the
e-mail digest pick the reader's language and fall back to the source text; nothing else changes.

```sh
npx derivative-segments translate --feed public/changelog.json --to de,fr --provider deepl --embed
```

Details are not sent in embed mode; running again with more languages adds them.

## Drafts and approval

Review release notes like code. A draft is one JSON file per release in `changelog/drafts/`, with a
`status` of `draft`, `review` or `approved` (which needs `approvedBy`) and an optional `publishAt`:

```sh
npx derivative-segments drafts new 2.5.0      # writes changelog/drafts/2.5.0.json
npx derivative-segments drafts check          # use it in CI: errors exit with 1
npx derivative-segments drafts publish --feed public/changelog.json
```

`publish` adds every approved draft whose time has come to the feed and leaves the rest out, so a
draft is invisible until a pull request sets `approved` and branch protection lets it through. In
code: `checkDrafts(files)` and `applyDrafts(feed, drafts)`.

## Import from Linear, Jira and Notion

Pull release notes from your tracker and review them as drafts. The import only reads and needs
a read-only token in the environment:

```sh
export LINEAR_API_KEY=...
npx derivative-segments import --source linear --team ENG --since 2026-01-01
# Jira: JIRA_EMAIL and JIRA_API_TOKEN
npx derivative-segments import --source jira --url https://acme.atlassian.net --project WEB
# Notion: NOTION_TOKEN
npx derivative-segments import --source notion --database <id> --props published=Live
```

A Linear cycle, a Jira version (its issues with that fix version) or a Notion version (pages grouped by
the `Version` property) becomes one draft with a linked entry per issue. Labels or issue types decide
the entry type, with `--map bug=fix,story=feature` for your own names; `audience:pro` labels set an
audience, and issues labelled `internal`, `no-changelog` or `skip-changelog` stay out (`--exclude`
changes the list). Compared with the free readers, the import reads every page of cycles, issues,
versions and pages, repeats requests on rate limits (`Retry-After` is honoured), server errors and
network failures (`--attempts`, default 4), and stops a hanging request after 20 seconds.

A draft that is already in `review` or `approved` is never overwritten, so you can run the import
again whenever the tracker changes; a draft still in `draft` is refreshed. `--dry-run` shows what
would be written. In code: `importLinear`, `importJira`, `importNotion` and `importToDrafts`.

This is **beta**: it is tested against mock servers of the documented APIs (including pagination,
rate limits and errors), not yet against live accounts. Read the drafts before you approve them.

## AI-written drafts

`draft` writes a first version of the notes from your commits or a list of changes, with your own
provider key (`DERIVATIVE_DRAFT_KEY`), using OpenAI-compatible endpoints or Anthropic:

```sh
npx derivative-segments draft --id 2.5.0 --provider anthropic --model claude-haiku-4-5-20251001 --from-git v2.4.0..HEAD
```

The result is always a `draft` marked `generated`, never published by itself; `drafts check`
rejects a generated draft that a person has not approved. Commit messages and ticket texts are sent
to the provider you choose, so check that this is allowed for your project. The model gets them as
data, its answer must match a fixed schema, every entry must cite a real change, links come only
from your input, and HTML or links it writes are removed. It is still a language model: read every
line. `--dry-run` shows what would be sent.

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
