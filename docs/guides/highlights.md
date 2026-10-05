---
title: Highlights
description: Add a title, summary and image to a release.
---

Generated entries are precise but dry. For releases that deserve attention, add a highlight in `derivative.config.json`. It is merged into the generated release by version:

```json
{
  "highlights": {
    "2.4.0": {
      "title": "Dark mode is here",
      "summary": "Switch it on under **Settings → Appearance**.",
      "image": "/changelog/dark-mode.png"
    }
  }
}
```

The widget shows the title instead of the version (the version moves next to the date), and the summary and image above the entries. The Atom feed and HTML page use them too.
