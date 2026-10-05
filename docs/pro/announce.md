---
title: Announce
description: E-mail digest and chat posts for new releases.
---

`@weber-development/derivative-announce` turns new releases into an e-mail and chat messages, in
English, German, French or Italian.

## E-mail digest

```sh
npx derivative-announce digest --feed public/changelog.json --product "Acme" \
  --url https://acme.example/changelog --lang de \
  --logo https://acme.example/logo.png --color "#0f766e" \
  --unsubscribe https://acme.example/unsubscribe --footer "Acme AG, Bahnhofstrasse 1, 8001 Zürich" \
  --state .announce-mail.json --out digest.html
```

This writes `digest.html` and `digest.txt` and prints the subject line. The layout uses tables and
inline styles, so it renders in Outlook and Gmail. Sending is up to you: hand the files to
Postmark, Resend, SES or your newsletter tool.

## Chat

```sh
DERIVATIVE_WEBHOOK_URL=https://hooks.slack.com/... \
  npx derivative-announce post --to slack --feed public/changelog.json --product "Acme" \
  --state .announce-slack.json
```

`--to` accepts `slack`, `teams`, `discord`, `mattermost` and `google-chat`. Use `--dry-run` to print
the payload instead. Keep webhook URLs in your CI secrets.

## Mastodon

```sh
DERIVATIVE_MASTODON_TOKEN=... npx derivative-announce post --to mastodon \
  --instance https://mastodon.social --feed public/changelog.json --product "Acme" \
  --hashtag changelog --state .announce-mastodon.json
```

Each release becomes one public status of at most 500 characters: title, the first summary
paragraph and as many entries as fit, then the changelog link and hashtags. Create the token under
Preferences → Development with only the `write:statuses` scope. The instance can also come from
`DERIVATIVE_MASTODON_URL`.

## Each release once

`--state <file>` stores the newest announced release. The next run only picks up releases after
it, so a CI job can run on every deploy. Use one state file per channel. Without a state file,
`--since <date>` and `--limit <n>` select the releases.

## In code

```ts
import {
  chatPayload,
  postWebhook,
  renderDigest,
  selectReleases,
} from "@weber-development/derivative-announce";

const releases = selectReleases(feed, { after: lastAnnounced });
const { subject, html, text } = renderDigest(releases, { name: "Acme", url }, { lang: "de" });
await postWebhook(webhookUrl, chatPayload("teams", releases[0], { product: "Acme", url }));
```
