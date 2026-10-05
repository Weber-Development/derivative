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

## Static sites

```sh
npx derivative-segments split --feed public/changelog.json --rules segments.json --out-dir public/feeds
```

This writes one feed per audience, for example `public/feeds/pro.json`, and
`public/feeds/public.json` for anonymous visitors. Each audience feed also contains the entries
meant for everyone.

Segments filter what is shown. They are not access control: anyone who can fetch a feed can read
all of it, so keep confidential text out of feeds that are publicly reachable.
