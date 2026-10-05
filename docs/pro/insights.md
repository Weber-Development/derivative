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
