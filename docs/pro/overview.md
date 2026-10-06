---
title: Derivative Pro
description: Read statistics, audience segments and release announcements for teams and agencies.
---

Derivative Pro adds three packages to the free widget and CLI. They run on your own
infrastructure and send nothing to us.

| Package | What it does |
|---|---|
| [`derivative-insights`](/derivative/docs/pro/insights) | Shows how often the panel is opened, which releases are read and which links are clicked. Readers can vote whether a release helped. No cookies, no visitor IDs. |
| [`derivative-segments`](/derivative/docs/pro/segments) | Shows entries only to certain plans or roles, publishes releases on a schedule and translates the feed into more languages. |
| [`derivative-announce`](/derivative/docs/pro/announce) | Sends an e-mail digest to a subscriber list with double opt-in (Resend, Postmark, Amazon SES or SMTP) and posts releases to Slack, Teams, Discord, Mattermost, Google Chat, Mastodon or Bluesky. |

The packages read the same `changelog.json` the free CLI writes. They do not depend on
`@sweberdev/derivative` and can be used with any feed in that format.

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
