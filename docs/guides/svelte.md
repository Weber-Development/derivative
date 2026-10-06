---
title: Svelte
description: Using the widget in Svelte 5 and SvelteKit.
---

Svelte talks to web components without a wrapper, so there is no separate package. Install the core package, import the widget once on the client, and use the element.

```sh
pnpm add @sweberdev/derivative
```

```svelte
<script lang="ts">
  import { onMount } from "svelte";

  onMount(() => import("@sweberdev/derivative/widget"));
</script>

<header>
  <a href="/">Acme</a>
  <derivative-widget src="/changelog.json" lang="de" announce search></derivative-widget>
</header>
```

The dynamic import inside `onMount` keeps the widget out of server rendering. In SvelteKit, put `changelog.json` in `static/`; `derivative init` detects SvelteKit and writes it there.

## Events and properties

Events bubble, so you can listen on the element:

```svelte
<script lang="ts">
  import type { DerivativeWidget } from "@sweberdev/derivative/widget/define";

  let widget: DerivativeWidget | undefined = $state();

  $effect(() => {
    const read = (event: Event) => console.log((event as CustomEvent).detail.lastSeen);
    widget?.addEventListener("derivative-read", read);
    return () => widget?.removeEventListener("derivative-read", read);
  });
</script>

<derivative-widget bind:this={widget} src="/changelog.json"></derivative-widget>
```

To pass a feed you already have, set the `feed` property instead of `src`: `widget.feed = feed`. Texts can be replaced with `widget.messages = { whatsNew: "News" }`.

## Types for svelte-check

To stop `svelte-check` from complaining about the unknown tag, declare it once, for example in `src/app.d.ts`:

```ts
import type { DerivativeWidget } from "@sweberdev/derivative/widget/define";

declare module "svelte/elements" {
  interface SvelteHTMLElements {
    "derivative-widget": {
      src?: string;
      lang?: string;
      mode?: "popover" | "inline";
      limit?: number;
      "storage-key"?: string;
      href?: string;
      label?: string;
      align?: "start" | "end";
      theme?: "light" | "dark";
      types?: string;
      announce?: boolean;
      search?: boolean;
      "bind:this"?: DerivativeWidget | undefined;
    };
  }
}
```
