# Release checklist (package-launch)

| Item | Status |
|---|---|
| Repo `Weber-Development/derivative` | private; created by the Werkbank workflow `new-package` (secret `NPM_TOKEN` set there) |
| npm `@sweberdev/derivative`, `@sweberdev/derivative-react` | 0.1.0 via the first changeset; version PR #2 open. npm provenance needs a public repo, so make the repo public first, then merge #2 |
| packages.sweber.dev | entry and live demo at packages.sweber.dev/derivative (sxwxbxr/portfoliov3#65, merged) |
| Docs | Markdown in `docs/` with `nav.json`, rendered at packages.sweber.dev/derivative/docs once the repo is public; Pro pages under `docs/pro/` |
| Pro | yes (Seya, 2026-10-05): `@weber-development/derivative-{insights,segments,announce}` in `Weber-Development/derivative-pro`, customers via `derivative-pro-dist` |
| Prices | Freelancer 12 CHF/month or 120/year, Agency 39/390, Lifetime 1'290 CHF (Seya, 2026-10-05) |
| Polar | config in Werkbank `packages/derivative.json`; benefit "Derivative Pro" to be created by Seya |
| Blog post | `content/blog/derivative-0-1-0-released.md` in portfoliov3, after 0.1.0 is on npm |
| Trademark check "Derivative" | open (Seya) |

## Open (Seya)

- [ ] Make the repository public (Werkbank `go-public`), then merge the "version packages" PR #2.
- [ ] Merge derivative-pro#1 and the Werkbank PR for `packages/derivative.json`.
- [ ] Create the Polar benefit "Derivative Pro" (GitHub Repository Access, `derivative-pro-dist`, role Read).
