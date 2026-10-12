---
title: Feed format
description: The changelog.json schema.
---

`changelog.json` is plain JSON you can also write by hand or generate from a CMS.

```json
{
  "version": 2,
  "title": "Acme changelog",
  "link": "https://acme.ch/changelog",
  "generatedAt": "2026-10-05T10:00:00.000Z",
  "releases": [
    {
      "id": "2.4.0",
      "version": "2.4.0",
      "date": "2026-10-02",
      "title": "Dark mode is here",
      "summary": "Switch it on under **Settings → Appearance**.",
      "importance": "major",
      "media": [{ "type": "image", "url": "/dark.png", "alt": "The dashboard in dark mode" }],
      "links": [{ "label": "Read the guide", "url": "https://acme.ch/docs/dark-mode" }],
      "translations": {
        "de": { "title": "Dunkelmodus ist da", "entries": { "ACME-12": "Dunkelmodus für das Dashboard" } }
      },
      "entries": [
        { "id": "ACME-12", "type": "feature", "text": "Dark mode for the dashboard", "target": "#theme-switch" },
        { "type": "fix", "text": "Rounding of Swiss francs", "scope": "billing", "link": "https://…", "audience": ["pro"] }
      ]
    }
  ]
}
```

| Field | Required | Notes |
|---|---|---|
| `version` | yes | `2`. Files with `1` are accepted and converted |
| `releases` | yes | Newest first |
| `releases[].id` | yes | Stable key for the unread state, usually the version |
| `releases[].entries` | yes | May be empty when a title or summary is set |
| `releases[].date` | | ISO 8601 date or date-time |
| `releases[].package` | | Package name in monorepo feeds |
| `entries[].type` | yes | `feature`, `improvement`, `fix`, `breaking`, `security`, `deprecated`, `removed` or `other` |
| `entries[].text` | yes | One line, inline Markdown |
| `entries[].details` | | More paragraphs or a `-` list |
| `entries[].scope`, `entries[].link` | | |
| `releases[].importance` | | `major` or `normal`. The widget's `highlight` prefers `major` releases |
| `releases[].media` | | `[{ type: "image" \| "video", url, alt? }]`, shown above the entries |
| `releases[].links` | | `[{ label, url }]`, shown under the entries |
| `releases[].audience`, `entries[].audience` | | Names of the audiences that see it. Empty or missing: everyone |
| `releases[].translations` | | `{ "<lang>": { title?, summary?, entries? } }`, where `entries` maps an entry `id` to its translated text |
| `entries[].id` | | Stable id of an entry (ticket key). Needed to translate it |
| `entries[].target` | | CSS selector of the page element the entry is about, for the widget's `hints` |

The widget validates the file with `parseFeed` and ignores unknown fields. URLs in `link`, `media` and `links` must be `http(s)`, `mailto` or relative; others are dropped. For widgets still on 1.x, `derivative build --feed-format 1` writes the old format (the first image becomes `image`; media, links, audiences and translations are left out).
