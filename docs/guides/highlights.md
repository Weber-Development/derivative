---
title: Highlights
description: Add a title, summary, media, links and importance to a release.
---

Generated entries are precise but dry. For releases that deserve attention, add a highlight in `derivative.config.json`. It is merged into the generated release by version:

```json
{
  "highlights": {
    "2.4.0": {
      "title": "Dark mode is here",
      "summary": "Switch it on under **Settings → Appearance**.",
      "importance": "major",
      "media": [{ "type": "image", "url": "/changelog/dark-mode.png", "alt": "The dashboard in dark mode" }],
      "links": [{ "label": "Read the guide", "url": "https://acme.ch/docs/dark-mode" }],
      "audience": ["beta"]
    }
  }
}
```

| Field | Meaning |
|---|---|
| `title`, `summary` | Shown instead of the version (which moves next to the date) and above the entries |
| `importance` | `major` makes the widget's `highlight` prefer this release over newer minor ones |
| `media` | Images and videos (`type: "image"` or `"video"`), shown above the entries. Give images an `alt` text; decorative ones get an empty one |
| `links` | Calls to action under the entries and in the modal |
| `audience` | Only readers with a matching `audience` attribute see the release |

The widget, the HTML page, the Atom feed and the JSON Feed use them. In format 1, a single `image` field did the job of `media`; it is still read.
