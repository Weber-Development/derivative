---
"@sweberdev/derivative": major
"@sweberdev/derivative-react": major
"@sweberdev/derivative-vue": major
---

Derivative 2.0: from changelog to release communication.

- **Feed format 2**: releases can carry `media` (images, videos), `links`, `importance`, `audience`, `translations`; entries can carry `id`, `audience` and `target`. Format 1 files are still read; `derivative build --feed-format 1` still writes them.
- **Widget**: `highlight="toast|banner|modal"` replaces `announce`, `audience` filters content for the reader, `hints` marks page elements with `data-derivative-hint`, translations follow `lang`.
- **Sources (beta)**: Linear cycles, Jira versions and Notion databases, read-only.
- **Breaking**: `announce` → `highlight` (also in React and Vue), event `derivative-announce` → `derivative-highlight`, `dismissToast()` → `dismissHighlight()`, parts `toast*` → `highlight*`, release field `image` → `media`, `Feed.version` is `2`, Node.js 22 or newer. See the migration guide.
