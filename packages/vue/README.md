# @sweberdev/derivative-vue

Vue 3 bindings for [Derivative](https://packages.sweber.dev/derivative): the `<derivative-widget>` as a component and a composable for your own UI.

```sh
pnpm add @sweberdev/derivative @sweberdev/derivative-vue
```

```vue
<script setup lang="ts">
import { WhatsNew } from "@sweberdev/derivative-vue";
</script>

<template>
  <WhatsNew src="/changelog.json" lang="de" highlight search @read="(id) => console.log(id)" />
</template>
```

Props match the widget attributes in camelCase (`storageKey`), with `types` as an array and `search` and `hints` as booleans, `highlight` as `true`, `"toast"`, `"banner"` or `"modal"`, `audience` as an array, plus `feed`, `messages` and an `icon` slot. Events: `open` and `read`. In Nuxt, wrap it in `<ClientOnly>`.

`useChangelog({ src })` returns refs `status`, `feed`, `releases`, `unread`, `error` and a `markAllRead()` function for building your own UI.

Docs: [packages.sweber.dev/derivative/docs/guides/vue](https://packages.sweber.dev/derivative/docs/guides/vue). MIT licensed.

<!-- pro-promo -->
## Derivative Pro

Need more than the free package? **Derivative Pro** adds:

- Insights: opens, reads, link clicks and a helpful / not helpful vote per release, on your own endpoint
- Segments: entries per plan or role, scheduled releases, translations, drafts with approval
- Announce: double opt-in subscriber list, e-mail digests, and posts to Slack, Teams, Discord, Mastodon, Bluesky and more

Subscriptions from CHF 12 per month, or a one-time lifetime licence. [See what is included](https://packages.sweber.dev/derivative?utm_source=npm&utm_medium=readme&utm_campaign=pro)
