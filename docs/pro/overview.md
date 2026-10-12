---
title: Derivative Pro
description: Read statistics, audience segments and release announcements for teams and agencies.
---

Derivative Pro adds three packages to the free widget and CLI. They run on your own
infrastructure and send nothing to us.

| Package | What it does |
|---|---|
| [`derivative-insights`](/derivative/docs/pro/insights) | Shows how often the panel is opened, which releases are read and which links are clicked. Readers can vote whether a release helped. No cookies, no visitor IDs. |
| [`derivative-segments`](/derivative/docs/pro/segments) | Shows entries only to certain plans or roles, publishes releases on a schedule, translates the feed, and reviews drafts (also AI-written ones) before they go live. |
| [`derivative-announce`](/derivative/docs/pro/announce) | Sends an e-mail digest to a subscriber list with double opt-in (Resend, Postmark, Amazon SES or SMTP) and posts releases to Slack, Teams, Discord, Mattermost, Google Chat, Mastodon, Bluesky or LinkedIn. |

The packages read the same `changelog.json` the free CLI writes. They read feed format 2 (and still format 1) and do not depend on
`@sweberdev/derivative`. Version 2 of Pro matches Derivative 2: see the [migration guide](../guides/migrating-to-2.md).

## Licence and installation

Derivative Pro is licensed per person: Freelancer (1 person), Agency (up to 10) and Lifetime (up
to 10, one payment). After a purchase you get read access to the customer repository
`Weber-Development/derivative-pro-dist`; the packages are installed from GitHub Packages with a
token. The full guide is `INSTALL.md` in that repository.

```ini
# .npmrc
@weber-development:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${DERIVATIVE_PRO_TOKEN}
```

When a subscription ends, installed versions keep working. Only updates and repository access end.

## Stability

The Pro packages follow the same [stability promise](../reference/stability.md) as the core package: documented exports, CLI options and environment variables do not break in a minor release, deprecations are announced one minor release ahead, and Node 22 and newer is supported. A test in the repository fails when an export is added, removed or renamed by accident. The stored Insights events and the subscriber tables keep their format.

