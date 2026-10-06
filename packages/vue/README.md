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
  <WhatsNew src="/changelog.json" lang="de" announce search @read="(id) => console.log(id)" />
</template>
```

Props match the widget attributes in camelCase (`storageKey`), with `types` as an array and `announce` and `search` as booleans, plus `feed`, `messages` and an `icon` slot. Events: `open` and `read`. In Nuxt, wrap it in `<ClientOnly>`.

`useChangelog({ src })` returns refs `status`, `feed`, `releases`, `unread`, `error` and a `markAllRead()` function for building your own UI.

Docs: [packages.sweber.dev/derivative/docs/guides/vue](https://packages.sweber.dev/derivative/docs/guides/vue). MIT licensed.
