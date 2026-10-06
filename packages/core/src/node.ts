import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { createFeed } from "./feed";
import { type Commit, parseCommits } from "./parse/commits";
import { type GitHubRelease, parseGitHubReleases } from "./parse/github";
import { parseChangelog } from "./parse/markdown";
import { renderAtom, renderJsonFeed, renderPage } from "./render";
import type { EntryType, Feed, Highlights, Release } from "./types";

const run = promisify(execFile);

export interface DerivativeConfig {
  /**
   * `changelog` reads CHANGELOG.md files, `git` reads conventional commits, `github` reads the
   * releases of `repo` through the GitHub API. Default `changelog` if a file exists, else `git`.
   */
  source?: "changelog" | "git" | "github";
  /** GitHub: `owner/name`. Uses the `GITHUB_TOKEN` environment variable when set. */
  repo?: string;
  /** GitHub: include pre-releases. */
  includePrereleases?: boolean;
  /** One or more CHANGELOG.md paths (monorepos: one per package). Default `CHANGELOG.md`. */
  changelog?: string | string[];
  /** Git: only tags matching this regular expression start a release. */
  tagPattern?: string;
  /** Git: commit types to keep, e.g. `{ "feat": "feature", "fix": "fix" }`. */
  types?: Record<string, EntryType>;
  /** Git: link template for commits, `{hash}` is replaced. */
  commitUrl?: string;
  includeUnreleased?: boolean;
  title?: string;
  /** Public URL of the full changelog page. */
  link?: string;
  limit?: number;
  /** Titles, summaries and images written by a person, keyed by version. */
  highlights?: Highlights;
  /** Where to write. Paths are relative to the config file. */
  out?: { json?: string; atom?: string; html?: string; jsonFeed?: string };
  /** Public URL of the Atom file. */
  atomUrl?: string;
  /** Public URL of the JSON Feed file. */
  jsonFeedUrl?: string;
  lang?: string;
}

export const CONFIG_FILE = "derivative.config.json";

export { detectConfig, type InitResult, init } from "./init";

/** Reads commits with their tags, newest first. */
export async function readGitCommits(cwd = process.cwd(), range?: string): Promise<Commit[]> {
  const format = ["%H", "%cI", "%s", "%b", "%D"].join("%x1f");
  const args = ["log", `--format=${format}%x1e`, "--no-merges"];
  if (range) args.push(range);
  const { stdout } = await run("git", args, { cwd, maxBuffer: 64 * 1024 * 1024 });
  return stdout
    .split("\x1e")
    .map((record) => record.replace(/^\n/, ""))
    .filter((record) => record.trim() !== "")
    .map((record) => {
      const [hash = "", date = "", subject = "", body = "", refs = ""] = record.split("\x1f");
      const tags = refs
        .split(", ")
        .filter((ref) => ref.startsWith("tag: "))
        .map((ref) => ref.slice(5).trim());
      return { hash, date, subject, body: body.trim(), tags };
    });
}

/** Looks up the date of a version tag (`v1.2.0`, `1.2.0` or `<package>@1.2.0`). */
export async function readTagDate(
  version: string,
  pkg: string | undefined,
  cwd = process.cwd(),
): Promise<string | undefined> {
  const candidates = [pkg ? `${pkg}@${version}` : "", `v${version}`, version].filter(Boolean);
  for (const tag of candidates) {
    try {
      const { stdout } = await run("git", ["log", "-1", "--format=%cI", tag, "--"], { cwd });
      if (stdout.trim()) return stdout.trim();
    } catch {
      // Tag does not exist, try the next form.
    }
  }
  return undefined;
}

/** Reads published releases of a GitHub repository, newest first (up to 300). */
export async function readGitHubReleases(
  repo: string,
  options: { token?: string; fetch?: typeof fetch; apiUrl?: string } = {},
): Promise<GitHubRelease[]> {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo))
    throw new Error(`"${repo}" is not an owner/name repository.`);
  const doFetch = options.fetch ?? fetch;
  const token = options.token ?? process.env.GITHUB_TOKEN;
  const api = options.apiUrl ?? "https://api.github.com";
  const all: GitHubRelease[] = [];
  for (let page = 1; page <= 3; page++) {
    const response = await doFetch(`${api}/repos/${repo}/releases?per_page=100&page=${page}`, {
      headers: {
        accept: "application/vnd.github+json",
        "user-agent": "derivative",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) {
      throw new Error(
        `GitHub API ${response.status} for ${repo}${token ? "" : " (set GITHUB_TOKEN for private repositories)"}`,
      );
    }
    const batch = (await response.json()) as GitHubRelease[];
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all;
}

async function exists(path: string): Promise<boolean> {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
}

/** Builds the feed described by a config, relative to `cwd`. */
export async function buildFeed(config: DerivativeConfig = {}, cwd = process.cwd()): Promise<Feed> {
  const files = [config.changelog ?? "CHANGELOG.md"].flat();
  const source =
    config.source ??
    ((await exists(resolve(cwd, files[0] ?? ""))) ? "changelog" : config.repo ? "github" : "git");
  let releases: Release[] = [];

  if (source === "changelog") {
    for (const file of files) {
      const parsed = parseChangelog(await readFile(resolve(cwd, file), "utf8"), {
        includeUnreleased: config.includeUnreleased,
      });
      // Changesets writes no dates; take them from the git tags when available.
      for (const release of parsed) {
        if (!release.date && release.version) {
          const date = await readTagDate(release.version, release.package, cwd);
          if (date) release.date = date;
        }
      }
      releases.push(...parsed);
    }
    // Single-package feeds don't need the package name on every release.
    if (files.length === 1) releases = releases.map(({ package: _, ...rest }) => rest);
  } else if (source === "github") {
    if (!config.repo) throw new Error('source "github" needs "repo", e.g. "acme/app".');
    releases = parseGitHubReleases(await readGitHubReleases(config.repo), {
      includePrereleases: config.includePrereleases,
    });
  } else {
    const template = config.commitUrl;
    releases = parseCommits(await readGitCommits(cwd), {
      types: config.types,
      tagPattern: config.tagPattern ? new RegExp(config.tagPattern) : undefined,
      includeUnreleased: config.includeUnreleased,
      commitUrl: template ? (hash) => template.replace("{hash}", hash) : undefined,
    });
  }

  return createFeed(releases, {
    title: config.title,
    link: config.link,
    limit: config.limit,
    highlights: config.highlights,
  });
}

export async function loadConfig(path: string): Promise<DerivativeConfig | undefined> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as DerivativeConfig;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw new Error(`Could not read ${path}: ${(error as Error).message}`);
  }
}

/** Builds the feed and writes every output named in `config.out`. Returns the written paths. */
export async function writeOutputs(
  feed: Feed,
  config: DerivativeConfig,
  cwd = process.cwd(),
): Promise<string[]> {
  const out = config.out ?? { json: "public/changelog.json" };
  const written: string[] = [];
  const write = async (file: string | undefined, content: string) => {
    if (!file) return;
    const path = resolve(cwd, file);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);
    written.push(path);
  };
  await write(out.json, `${JSON.stringify(feed, null, 2)}\n`);
  await write(out.atom, renderAtom(feed, { lang: config.lang, selfUrl: config.atomUrl }));
  await write(out.html, renderPage(feed, { lang: config.lang }));
  await write(
    out.jsonFeed,
    renderJsonFeed(feed, { lang: config.lang, selfUrl: config.jsonFeedUrl }),
  );
  return written;
}
