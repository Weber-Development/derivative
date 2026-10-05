---
title: Build and CI
description: Keep the feed current on every deploy.
---

Run `derivative build` before your app build so the feed ships with each deploy:

```json
{ "scripts": { "build": "derivative build --atom public/changelog.xml && next build" } }
```

For `--source git` and for dates of Changesets releases, the build needs the tags. Many CI systems clone shallowly without them. On GitHub Actions:

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0 # full history and tags
```

On Vercel, git history is not available during the build. Commit the generated `public/changelog.json` instead, for example in the Changesets version PR:

```json
{ "scripts": { "version": "changeset version && derivative build" } }
```

Add the Atom feed to your page head so readers can subscribe:

```html
<link rel="alternate" type="application/atom+xml" title="Changelog" href="/changelog.xml" />
```
