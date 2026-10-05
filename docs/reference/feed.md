---
title: Feed format
description: The changelog.json schema.
---

`changelog.json` is plain JSON you can also write by hand or generate from a CMS.

```json
{
  "version": 1,
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
      "entries": [
        { "type": "feature", "text": "Dark mode for the dashboard" },
        { "type": "fix", "text": "Rounding of Swiss francs", "scope": "billing", "link": "https://…" }
      ]
    }
  ]
}
```

| Field | Required | Notes |
|---|---|---|
| `version` | yes | Always `1` |
| `releases` | yes | Newest first |
| `releases[].id` | yes | Stable key for the unread state, usually the version |
| `releases[].entries` | yes | May be empty when a title or summary is set |
| `releases[].date` | | ISO 8601 date or date-time |
| `releases[].package` | | Package name in monorepo feeds |
| `entries[].type` | yes | `feature`, `improvement`, `fix`, `breaking`, `security`, `deprecated`, `removed` or `other` |
| `entries[].text` | yes | One line, inline Markdown |
| `entries[].details` | | More paragraphs or a `-` list |
| `entries[].scope`, `entries[].link` | | |

The widget validates the file with `parseFeed` and ignores unknown fields.
