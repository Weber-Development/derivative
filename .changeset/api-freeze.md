---
"@sweberdev/derivative": minor
"@sweberdev/derivative-react": minor
"@sweberdev/derivative-vue": minor
---

Release candidate for 1.0: the public API is frozen and a test fails when an export is added, removed or renamed without updating the API reference. The reference now lists every export, including the GitLab helpers. New pages "Stability" (what is covered, deprecation policy, supported environments) and "Upgrading" (changes that can be visible since 0.x). React and Vue gain the `headingLevel` prop that the widget has had since 0.6, React re-exports the `Feed`, `Release`, `EntryType` and `Messages` types like Vue, and `engines` declares Node 20. `pnpm rc` packs the packages like a release does and builds the examples from the tarballs, also in CI.
