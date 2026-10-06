---
title: Vue
description: WhatsNew and useChangelog for Vue 3 and Nuxt.
---

```sh
pnpm add @sweberdev/derivative @sweberdev/derivative-vue
```

## WhatsNew

The web component as a Vue 3 component (Vue 3.3 and later).

```vue
<script setup lang="ts">
import { WhatsNew } from "@sweberdev/derivative-vue";
</script>

<template>
  <header>
    <Logo />
    <WhatsNew src="/changelog.json" lang="de" announce search @open="track('whats-new-open')" />
  </header>
</template>
```

Props match the [widget attributes](widget.md) in camelCase (`storageKey`), with `types` and `packages` as arrays (`:types="['feature', 'fix']"`) and `announce` and `search` as booleans, plus `feed` and `messages`. Put your own icon in the `icon` slot. Events are `open` and `read` (with the id of the newest release the reader has now seen).

The component registers the custom element when it mounts, so it renders nothing on the server and the button appears after hydration. In Nuxt, wrap it in `<ClientOnly>` to avoid a hydration warning.

## useChangelog

Build your own UI, for example a dot on an existing menu item:

```vue
<script setup lang="ts">
import { useChangelog } from "@sweberdev/derivative-vue";

const { unread, markAllRead } = useChangelog({ src: "/changelog.json" });
</script>

<template>
  <a href="/changelog" @click="markAllRead">
    Changelog <span v-if="unread.length" class="dot" :aria-label="`${unread.length} new`" />
  </a>
</template>
```

It returns the refs `status` (`loading`, `ready`, `error`), `feed`, `releases`, `unread`, `error` and the function `markAllRead`. Storage is read after mount, so server and client render the same markup.

## Using the element directly

Without the package, tell Vue that `derivative-widget` is a custom element (`compilerOptions.isCustomElement` in Vite's Vue plugin) and import `@sweberdev/derivative/widget`. The component above does that for you.
