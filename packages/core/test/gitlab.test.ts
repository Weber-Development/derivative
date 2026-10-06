// @vitest-environment node
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseGitLabReleases } from "../src";
import { buildFeed, matchesPackage, readGitLabReleases } from "../src/node";

afterEach(() => vi.unstubAllGlobals());

const releases = [
  {
    tag_name: "v1.2.0",
    name: "Faster exports",
    description: "### Features\n\n- Export to CSV\n\n### Bug fixes\n\n- Fix timeout",
    released_at: "2026-10-01T08:00:00Z",
    _links: { self: "https://gitlab.com/acme/app/-/releases/v1.2.0" },
  },
  {
    tag_name: "v1.2.0-rc1",
    name: "v1.2.0-rc1",
    description: "- rc",
    released_at: "2026-09-28T08:00:00Z",
    upcoming_release: true,
  },
  {
    tag_name: "v1.1.0",
    name: "v1.1.0",
    description: "- fix: Handle empty list",
    released_at: "2026-09-01T08:00:00Z",
  },
];

describe("GitLab releases", () => {
  it("parses notes like GitHub releases and skips upcoming ones", () => {
    const parsed = parseGitLabReleases(releases);
    expect(parsed.map((r) => r.id)).toEqual(["1.2.0", "1.1.0"]);
    expect(parsed[0]).toMatchObject({ title: "Faster exports", date: "2026-10-01T08:00:00Z" });
    expect(parsed[0]?.entries.map((e) => [e.type, e.text])).toEqual([
      ["feature", "Export to CSV"],
      ["fix", "Fix timeout"],
    ]);
    expect(parseGitLabReleases(releases, { includePrereleases: true })).toHaveLength(3);
  });

  it("reads the API with the token and a self-managed URL, encoded project path", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(releases), { status: 200 }));
    const out = await readGitLabReleases("acme/team/app", {
      token: "glpat-x",
      baseUrl: "https://git.example.com/",
      fetch: fetchMock as never,
    });
    expect(out).toHaveLength(3);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(
      "https://git.example.com/api/v4/projects/acme%2Fteam%2Fapp/releases?per_page=100&page=1",
    );
    expect((init.headers as Record<string, string>)["private-token"]).toBe("glpat-x");
  });

  it("rejects odd project names and explains failures", async () => {
    await expect(readGitLabReleases("../etc")).rejects.toThrow("not a GitLab project");
    const fetchMock = vi.fn(async () => new Response("no", { status: 404 }));
    await expect(
      readGitLabReleases("acme/app", { fetch: fetchMock as never, token: "" }),
    ).rejects.toThrow("GitLab API 404 for acme/app (set GITLAB_TOKEN");
  });

  it("builds a feed from config", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(releases), { status: 200 })),
    );
    const feed = await buildFeed({ source: "gitlab", project: "acme/app" });
    expect(feed.releases.map((r) => r.id)).toEqual(["1.2.0", "1.1.0"]);
    await expect(buildFeed({ source: "gitlab" })).rejects.toThrow('needs "project"');
  });
});

describe("package filter", () => {
  it("matches names and prefixes", () => {
    expect(matchesPackage("@acme/web", ["@acme/*"])).toBe(true);
    expect(matchesPackage("@acme/web", ["@acme/web"])).toBe(true);
    expect(matchesPackage("@other/web", ["@acme/*"])).toBe(false);
    expect(matchesPackage(undefined, ["@acme/*"])).toBe(false);
  });

  it("keeps and drops packages in a monorepo feed", async () => {
    const dir = mkdtempSync(join(tmpdir(), "derivative-mono-"));
    mkdirSync(join(dir, "web"));
    mkdirSync(join(dir, "api"));
    writeFileSync(
      join(dir, "web/CHANGELOG.md"),
      "# @acme/web\n\n## 2.0.0 - 2026-10-01\n\n### Added\n\n- Dark mode\n",
    );
    writeFileSync(
      join(dir, "api/CHANGELOG.md"),
      "# @acme/api\n\n## 1.0.0 - 2026-09-01\n\n### Added\n\n- Rate limits\n",
    );
    const files = ["web/CHANGELOG.md", "api/CHANGELOG.md"];
    const all = await buildFeed({ changelog: files }, dir);
    expect(all.releases.map((r) => r.package)).toEqual(["@acme/web", "@acme/api"]);
    const web = await buildFeed({ changelog: files, packages: ["@acme/web"] }, dir);
    expect(web.releases.map((r) => r.package)).toEqual(["@acme/web"]);
    const noApi = await buildFeed({ changelog: files, excludePackages: ["@acme/a*"] }, dir);
    expect(noApi.releases.map((r) => r.package)).toEqual(["@acme/web"]);
  });
});
