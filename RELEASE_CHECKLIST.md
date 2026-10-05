# Release checklist (package-launch)

| Item | Status |
|---|---|
| Repo `Weber-Development/derivative` | private; created by the Werkbank workflow `new-package` (secret `NPM_TOKEN` set there) |
| npm `@sweberdev/derivative`, `@sweberdev/derivative-react` | 0.1.0 via the first changeset; published by the release workflow once the "version packages" PR is merged |
| packages.sweber.dev | entry, docs config and live demo in sxwxbxr/portfoliov3 (branch `packages/derivative`) |
| Docs | Markdown in `docs/` with `nav.json`, rendered at packages.sweber.dev/derivative/docs once the repo is public |
| Pro | not decided yet (Seya); candidates: read statistics, audience segments, e-mail digest |
| Trademark check "Derivative" | open (Seya) |

## Open (Seya)

- [ ] Merge the setup PR, then the "version packages" PR.
- [ ] Make the repository public (Werkbank `go-public`), so the docs render.
- [ ] Decide on a Pro version.
