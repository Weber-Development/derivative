import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseChangelog, parseCommits, parseGitHubReleases, versionFromTag } from "../src";

const fixture = (name: string) => readFileSync(join(__dirname, "fixtures", name), "utf8");

describe("parseChangelog", () => {
  it("reads Changesets output", () => {
    const releases = parseChangelog(fixture("changesets.md"));
    expect(releases.map((r) => r.version)).toEqual(["1.3.0", "1.2.0"]);
    expect(releases[0]?.package).toBe("@acme/app");
    expect(releases[0]?.entries).toEqual([
      {
        type: "feature",
        text: "Add dark mode to the dashboard.",
        details: "Switch it on under **Settings → Appearance**.",
      },
      {
        type: "feature",
        text: "Export invoices as `CSV`",
        link: "https://github.com/acme/app/pull/42",
      },
      { type: "fix", text: "Fix rounding of Swiss francs." },
    ]);
    expect(releases[1]?.entries[0]).toEqual({ type: "breaking", text: "Drop Node 18." });
  });

  it("reads Keep a Changelog and conventional-changelog headings", () => {
    const releases = parseChangelog(fixture("keepachangelog.md"));
    expect(releases.map((r) => [r.version, r.date])).toEqual([
      ["2.0.0", "2026-09-30"],
      ["1.9.1", "2026-09-01"],
    ]);
    expect(releases[0]?.package).toBeUndefined();
    expect(releases[0]?.entries.map((e) => e.type)).toEqual(["feature", "fix", "security"]);
    expect(releases[1]?.entries[0]).toEqual({
      type: "fix",
      text: "Correct VAT for Liechtenstein",
      scope: "billing",
      link: "https://github.com/acme/app/commit/abc1234",
    });
  });

  it("keeps unreleased changes when asked", () => {
    const releases = parseChangelog(fixture("keepachangelog.md"), { includeUnreleased: true });
    expect(releases[0]).toMatchObject({
      id: "unreleased",
      entries: [{ text: "Something in progress." }],
    });
    expect(releases[0]?.version).toBeUndefined();
  });
});

describe("parseCommits", () => {
  const commits = [
    { hash: "e5", date: "2026-10-03T10:00:00Z", subject: "feat: unreleased thing" },
    {
      hash: "d4",
      date: "2026-10-02T10:00:00Z",
      subject: "chore(release): 1.1.0",
      tags: ["v1.1.0"],
    },
    { hash: "c3", date: "2026-10-01T10:00:00Z", subject: "feat(export)!: new CSV columns (#7)" },
    { hash: "b2", date: "2026-09-30T10:00:00Z", subject: "fix: typo [skip changelog]" },
    { hash: "b1", date: "2026-09-30T09:00:00Z", subject: "ci: faster builds" },
    {
      hash: "a1",
      date: "2026-09-29T10:00:00Z",
      subject: "perf: cache prices",
      body: "BREAKING CHANGE: prices are now cached for one hour",
    },
    {
      hash: "a0",
      date: "2026-09-01T10:00:00Z",
      subject: "feat: first",
      tags: ["v1.0.0", "latest"],
    },
  ];

  it("groups by version tag and filters by type", () => {
    const releases = parseCommits(commits, { commitUrl: (h) => `https://x/commit/${h}` });
    expect(releases.map((r) => [r.id, r.date])).toEqual([
      ["1.1.0", "2026-10-02T10:00:00Z"],
      ["1.0.0", "2026-09-01T10:00:00Z"],
    ]);
    expect(releases[0]?.entries).toEqual([
      { type: "breaking", text: "New CSV columns", scope: "export", link: "https://x/commit/c3" },
      {
        type: "breaking",
        text: "Cache prices",
        details: "prices are now cached for one hour",
        link: "https://x/commit/a1",
      },
    ]);
  });

  it("can keep unreleased commits and custom types", () => {
    const releases = parseCommits(commits, { includeUnreleased: true, types: { feat: "feature" } });
    expect(releases[0]).toMatchObject({
      id: "unreleased",
      entries: [{ text: "Unreleased thing" }],
    });
  });

  it("extracts versions from tags", () => {
    expect(versionFromTag("v1.2.3")).toBe("1.2.3");
    expect(versionFromTag("@acme/app@2.0.0-beta.1")).toBe("2.0.0-beta.1");
  });
});

describe("parseGitHubReleases", () => {
  it("reads generated notes, hand-written notes and skips drafts", () => {
    const releases = parseGitHubReleases([
      { tag_name: "v2.0.0-beta.1", name: "v2.0.0-beta.1", body: "", prerelease: true },
      { tag_name: "v1.3.0", draft: true, body: "* feat: Hidden" },
      {
        tag_name: "v1.2.0",
        name: "Exports",
        published_at: "2026-10-01T10:00:00Z",
        html_url: "https://github.com/acme/app/releases/tag/v1.2.0",
        body: [
          "## What's Changed",
          "* feat(export): add CSV export by @octocat in https://github.com/acme/app/pull/12",
          "* fix: crash on empty list by @dependabot[bot] in https://github.com/acme/app/pull/13",
          "* Update README by @octocat in https://github.com/acme/app/pull/14",
          "",
          "## New Contributors",
          "* @octocat made their first contribution in https://github.com/acme/app/pull/12",
          "",
          "**Full Changelog**: https://github.com/acme/app/compare/v1.1.0...v1.2.0",
        ].join("\n"),
      },
      {
        tag_name: "v1.1.0",
        name: "v1.1.0",
        published_at: "2026-09-01T10:00:00Z",
        body: "### Features\n\n- Faster search\n\n### Bug Fixes\n\n- Login on Safari",
      },
    ]);
    expect(releases.map((r) => r.id)).toEqual(["1.2.0", "1.1.0"]);
    const [first, second] = releases;
    expect(first?.title).toBe("Exports");
    expect(first?.date).toBe("2026-10-01T10:00:00Z");
    expect(first?.entries).toEqual([
      {
        type: "feature",
        scope: "export",
        text: "Add CSV export",
        link: "https://github.com/acme/app/pull/12",
      },
      { type: "fix", text: "Crash on empty list", link: "https://github.com/acme/app/pull/13" },
      { type: "other", text: "Update README", link: "https://github.com/acme/app/pull/14" },
    ]);
    expect(second?.title).toBeUndefined();
    expect(second?.entries.map((e) => [e.type, e.text])).toEqual([
      ["feature", "Faster search"],
      ["fix", "Login on Safari"],
    ]);
  });

  it("includes pre-releases on request", () => {
    const releases = parseGitHubReleases(
      [{ tag_name: "v2.0.0-beta.1", body: "- Try it", prerelease: true }],
      { includePrereleases: true },
    );
    expect(releases[0]?.version).toBe("2.0.0-beta.1");
  });
});
