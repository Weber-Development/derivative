// @vitest-environment node
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { main } from "../src/cli";
import { buildFeed } from "../src/node";

function repo(): string {
  const dir = mkdtempSync(join(tmpdir(), "derivative-"));
  const git = (...args: string[]) =>
    execFileSync("git", args, {
      cwd: dir,
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: "t",
        GIT_AUTHOR_EMAIL: "t@t",
        GIT_COMMITTER_NAME: "t",
        GIT_COMMITTER_EMAIL: "t@t",
        GIT_COMMITTER_DATE: "2026-09-01T10:00:00Z",
      },
    });
  git("init", "-q");
  git("commit", "-q", "--allow-empty", "-m", "feat: first feature");
  git("tag", "v1.0.0");
  git("commit", "-q", "--allow-empty", "-m", "fix(api): handle timeouts");
  git("commit", "-q", "--allow-empty", "-m", "docs: readme");
  git("tag", "v1.1.0");
  return dir;
}

describe("buildFeed", () => {
  it("reads git history", async () => {
    const feed = await buildFeed({ source: "git" }, repo());
    expect(feed.releases.map((r) => r.id)).toEqual(["1.1.0", "1.0.0"]);
    expect(feed.releases[0]?.entries).toEqual([
      { type: "fix", text: "Handle timeouts", scope: "api" },
    ]);
  });

  it("dates Changesets releases from tags", async () => {
    const dir = repo();
    writeFileSync(
      join(dir, "CHANGELOG.md"),
      "# app\n\n## 1.1.0\n\n### Patch Changes\n\n- abc1234: Fix\n",
    );
    const feed = await buildFeed({}, dir);
    expect(feed.releases[0]?.id).toBe("1.1.0");
    expect(Date.parse(feed.releases[0]?.date ?? "")).toBe(Date.parse("2026-09-01T10:00:00Z"));
    expect(feed.releases[0]?.package).toBeUndefined();
  });
});

describe("derivative build", () => {
  it("writes json, atom and html", async () => {
    const dir = repo();
    writeFileSync(
      join(dir, "derivative.config.json"),
      JSON.stringify({
        source: "git",
        title: "Acme",
        highlights: { "1.1.0": { title: "Faster API" } },
      }),
    );
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const code = await main([
      "build",
      "--config",
      join(dir, "derivative.config.json"),
      "--atom",
      "public/changelog.xml",
      "--html",
      "public/changelog.html",
    ]);
    stdout.mockRestore();
    expect(code).toBe(0);
    const feed = JSON.parse(readFileSync(join(dir, "public/changelog.json"), "utf8"));
    expect(feed).toMatchObject({ version: 1, title: "Acme" });
    expect(feed.releases[0]).toMatchObject({ id: "1.1.0", title: "Faster API" });
    expect(readFileSync(join(dir, "public/changelog.xml"), "utf8")).toContain("<feed");
    expect(readFileSync(join(dir, "public/changelog.html"), "utf8")).toContain("Faster API");
  });

  it("rejects unknown commands", async () => {
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    expect(await main(["nope"])).toBe(2);
    stderr.mockRestore();
  });
});

describe("init", () => {
  it("writes a config and runs derivative build before the build script", async () => {
    const { init } = await import("../src/node");
    const dir = mkdtempSync(join(tmpdir(), "derivative-init-"));
    writeFileSync(join(dir, "CHANGELOG.md"), "# Changelog\n");
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({ name: "app", scripts: { build: "vite build" } }, null, 2),
    );
    const result = await init(dir);
    expect(result.changed).toEqual(["derivative.config.json", "package.json"]);
    expect(JSON.parse(readFileSync(join(dir, "derivative.config.json"), "utf8"))).toEqual({
      source: "changelog",
      out: { json: "public/changelog.json", atom: "public/changelog.xml" },
    });
    expect(JSON.parse(readFileSync(join(dir, "package.json"), "utf8")).scripts).toEqual({
      build: "derivative build && vite build",
      changelog: "derivative build",
    });
    // A second run changes nothing.
    const again = await init(dir);
    expect(again.changed).toEqual([]);
    expect(again.notes).toHaveLength(2);
  });

  it("falls back to git and leaves package.json alone with scripts: false", async () => {
    const { init } = await import("../src/node");
    const dir = mkdtempSync(join(tmpdir(), "derivative-init-"));
    writeFileSync(join(dir, "package.json"), "{}");
    const result = await init(dir, { scripts: false });
    expect(result.config.source).toBe("git");
    expect(readFileSync(join(dir, "package.json"), "utf8")).toBe("{}");
  });
});
