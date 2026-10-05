---
title: Getting started
description: Build a feed and add the widget in five minutes.
---

1. Install the package:

   ```sh
   pnpm add @sweberdev/derivative
   ```

   With npm: `npm i @sweberdev/derivative`.

2. Build the feed. With a `CHANGELOG.md` in the project root (for example from Changesets):

   ```sh
   npx derivative build
   ```

   Without a changelog file, Derivative reads your git history instead. It needs version tags (`v1.2.0`) and conventional commits (`feat:`, `fix:`):

   ```sh
   npx derivative build --source git
   ```

   Both write `public/changelog.json`. Add the build to your `build` script so the feed is always current:

   ```json
   { "scripts": { "build": "derivative build && vite build" } }
   ```

3. Add the widget where the button should appear, for example in your header:

   ```html
   <derivative-widget src="/changelog.json" lang="de"></derivative-widget>
   <script type="module">
     import "@sweberdev/derivative/widget";
   </script>
   ```

   In React, use the [React component](guides/react.md) instead.

4. Open the app. The button shows how many releases are new, and opening it marks them as seen.

## Requirements

- Node.js 20 or newer for the CLI
- git on the `PATH` for `--source git` and for release dates of Changesets changelogs
- Any current browser for the widget (custom elements and shadow DOM)
