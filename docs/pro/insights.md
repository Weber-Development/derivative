---
title: Insights
description: Read statistics for the widget with your own endpoint and an HTML report.
---

`@weber-development/derivative-insights` listens to the widget's events and sends them to an
endpoint on your own server.

## Track

```ts
import { trackInsights } from "@weber-development/derivative-insights";

const stop = trackInsights(document, { endpoint: "/api/derivative-insights" });
```

| Option | Default | |
|---|---|---|
| `endpoint` | required | Your route that receives events. |
| `sampleRate` | `1` | Share of page views that send events, 0 to 1. |
| `respectDoNotTrack` | `true` | Sends nothing when the browser sets Do Not Track or Global Privacy Control. |

Three events are sent: `open` (the panel opened, with the number of unread releases), `read` (the
reader caught up) and `click` (a link inside a release). Query strings and fragments are removed
from every URL before it leaves the browser and again on the server.

## Reactions

Ask readers whether a release was useful. `addReactions` puts a "Was this helpful?" vote (Yes and
No, in English, German, French or Italian) under every release in the widget and sends each vote to
the same endpoint:

```ts
import { addReactions, trackInsights } from "@weber-development/derivative-insights";

trackInsights(document, { endpoint: "/api/derivative-insights" });
addReactions(document, { endpoint: "/api/derivative-insights" });
```

| Option | Default | |
|---|---|---|
| `endpoint` | required | The same route as for `trackInsights`. |
| `messages` | by language | Replace `question`, `up`, `down` or `thanks`. |
| `storageKey` | `derivative:reactions` | Where the browser remembers its own votes. |
| `respectDoNotTrack` | `true` | Sends no votes when the browser sets Do Not Track or Global Privacy Control. |

There is no cookie and no visitor ID. The browser remembers its votes in `localStorage`, and a
changed vote also names the old one, so it replaces it instead of counting twice. The report and the
CSV show helpful and not helpful per release, and the report adds the share of helpful votes overall.
The bar uses the widget's `derivative-render` event, so it needs `@sweberdev/derivative` 0.5.0 or
later. Its look follows the widget's CSS variables, and the wrapper has `part="reactions"` for your own
styles.

## Receive

```ts
// app/api/derivative-insights/route.ts
import { createInsightsHandler } from "@weber-development/derivative-insights";
import { fileStore } from "@weber-development/derivative-insights/node";

export const POST = createInsightsHandler({
  store: fileStore(".data/insights.ndjson"),
  allowedOrigins: ["https://app.example.com"],
});
```

The handler works in any runtime with the Fetch API. It answers `204` for valid and invalid
events alike, rejects bodies over 8 KiB (`maxBytes`) and rejects other origins unless they are
listed. For a database, implement `InsightStore` with `append(events)` and `read(since)`.

## Database

On serverless hosts without a persistent disk, keep events in Postgres or SQLite instead of a
file. `sqlStore` needs no driver of its own; pass a function that runs one query:

```ts
import { neon } from "@neondatabase/serverless";
import { createInsightsHandler, sqlStore } from "@weber-development/derivative-insights";

const sql = neon(process.env.DATABASE_URL!);
const store = sqlStore((query, params) => sql.query(query, params));
await store.setup(); // once: creates the derivative_insights table

export const POST = createInsightsHandler({ store });
```

With `pg`, pass `(q, p) => pool.query(q, p).then((r) => r.rows)`. For SQLite (better-sqlite3,
Turso, Cloudflare D1) set `{ dialect: "sqlite" }`. `setupSql()` returns the `CREATE TABLE`
statements if you run migrations yourself. For the report, read the events in a small script:
`summarize(await store.read(since), feed)` and `renderReport(summary)`.

## Report

```sh
npx derivative-insights report --events .data/insights.ndjson --feed public/changelog.json \
  --since 2026-09-01 --out insights.html
```

The report shows opens, reads and clicks per release, the most clicked links and a daily chart.
`--json summary.json` also writes the summary as JSON. `--csv releases.csv` writes one row per
release and `releases-daily.csv` with opens per day, for Excel or a spreadsheet. In code:
`summarize(events, feed)`, `renderReport(summary, { title })`, `releasesCsv(summary)` and
`dailyCsv(summary)`.

## Privacy

No cookie is set, no visitor ID is created and the handler stores no IP address. Your server and
hosting provider may still log IP addresses on their own. Whether you need consent depends on your
jurisdiction and setup; Derivative does not decide that for you.
