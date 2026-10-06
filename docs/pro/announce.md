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

## Bluesky

```sh
DERIVATIVE_BLUESKY_APP_PASSWORD=... npx derivative-announce post --to bluesky \
  --handle acme.bsky.social --feed public/changelog.json --product "Acme" \
  --hashtag changelog --state .announce-bluesky.json
```

Each release becomes one post of at most 300 characters with the changelog as a link card and the
hashtags as real tags. Create an app password under Settings → Privacy and security → App
passwords; never use the account password. The handle can also come from
`DERIVATIVE_BLUESKY_HANDLE`.

## Subscribers

The digest above leaves the sending to you. For a real subscriber list, Derivative Pro runs the
whole cycle with double opt-in: sign-up form, confirmation e-mail, one-click unsubscribe and the
sending itself, through Resend or Postmark. There is no third-party list to maintain and no
tracking: a subscriber is an e-mail address, a language and the timestamps of the request and
the confirmation.

### 1. The handler

One Fetch API handler (Next.js route handler, Hono, Remix, Deno, Bun, Cloudflare Workers) answers
`POST /subscribe`, `/confirm` and `/unsubscribe` below the URL where you mount it:

```ts
// app/api/news/[action]/route.ts (Next.js)
import { createSubscribeHandler, resendSender } from "@weber-development/derivative-announce";
import { fileSubscribers } from "@weber-development/derivative-announce/node";

const handler = createSubscribeHandler({
  store: fileSubscribers(".data/subscribers.json"),
  secret: process.env.DERIVATIVE_SUBSCRIBE_SECRET!, // 32+ random characters, keep it secret
  send: resendSender(process.env.DERIVATIVE_RESEND_KEY!),
  from: "Acme <news@acme.ch>", // the domain must be verified at your provider
  product: "Acme",
  baseUrl: "https://acme.ch/api/news",
  lang: "de",
});
export { handler as GET, handler as POST };
```

Your form posts `email` (and optionally `lang`) to `/api/news/subscribe`, as a form or as JSON
with `Accept: application/json`. The answer is the same for known and unknown addresses.

What the handler takes care of, so you do not have to:

- **Double opt-in.** An address is only mailed after its owner clicked the link. The link carries
  a signed token that expires after seven days and works for confirming only.
- **Mail scanners.** Corporate scanners open every link in a mail. The confirm and unsubscribe
  links therefore show a button, and only the click on it (a `POST`) changes anything.
- **One-click unsubscribe.** The same `POST` answers the request that Gmail and Yahoo send for the
  `List-Unsubscribe-Post` header (RFC 8058), which both require from bulk senders.
- **No mail bombing.** An unconfirmed address is not mailed again within ten minutes, and a
  confirmed one is never mailed by the form.
- **Header injection.** Addresses with line breaks or other special characters are rejected.

Without a disk (Vercel, Workers), keep the list in Postgres or SQLite with
`sqlSubscribers(query, { dialect })`; `store.setup()` creates the table. It takes the same
driver-free query function as `sqlStore` in `derivative-insights`.

### 2. Sending

```sh
DERIVATIVE_SUBSCRIBE_SECRET=... DERIVATIVE_RESEND_KEY=... npx derivative-announce send \
  --feed public/changelog.json --subscribers .data/subscribers.json \
  --from "Acme <news@acme.ch>" --provider resend --base-url https://acme.ch/api/news \
  --product "Acme" --lang de --state .announce-mail.json
```

Each confirmed subscriber gets one e-mail with a personal unsubscribe link and the
`List-Unsubscribe` headers. `--provider postmark` uses `DERIVATIVE_POSTMARK_TOKEN` and the
`broadcast` message stream. `--dry-run` counts the recipients. With `--state`, each release goes
out once. Addresses that fail are listed and the exit code is 1; the others have their mail.
In code, call `sendDigest({ releases, brand, store, send, secret, baseUrl, from })`.

### 3. Managing the list

```sh
npx derivative-announce subscribers list   --file .data/subscribers.json
npx derivative-announce subscribers export --file .data/subscribers.json --status confirmed > consent.csv
npx derivative-announce subscribers remove --file .data/subscribers.json --email max@example.ch
```

`export` writes the evidence of consent: when each address was requested and confirmed. `remove`
deletes an address completely, for erasure requests.

### Legal notes

This is a technical aid, not legal advice. In Germany, Austria and Switzerland the double opt-in
with a stored confirmation time is the usual proof that the owner of the address agreed. Mention
the newsletter in your privacy policy (purpose, provider, how to unsubscribe) and your e-mail
provider as a processor, and sign a data processing agreement with them. The confirmation e-mail
and the digest contain no tracking pixels and no click tracking.

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
