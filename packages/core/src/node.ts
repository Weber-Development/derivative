import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { createFeed, toFeedV1 } from "./feed";
import { type Commit, parseCommits } from "./parse/commits";
import {
  type GitHubRelease,
  type GitLabRelease,
  parseGitHubReleases,
  parseGitLabReleases,
} from "./parse/github";
import { type JiraIssue, type JiraVersion, parseJiraVersions } from "./parse/jira";
import { LINEAR_CYCLES_QUERY, type LinearCycle, parseLinearCycles } from "./parse/linear";
import { parseChangelog } from "./parse/markdown";
import { type NotionPage, type ParseNotionOptions, parseNotionPages } from "./parse/notion";
import type { TrackerOptions } from "./parse/tracker";
import { renderAtom, renderJsonFeed, renderPage } from "./render";
import type { EntryType, Feed, Highlights, Release } from "./types";

const run = promisify(execFile);

export interface DerivativeConfig {
  /**
   * `changelog` reads CHANGELOG.md files, `git` reads conventional commits, `github` reads the
   * releases of `repo` through the GitHub API, `gitlab` those of `project` through the GitLab API.
   * `linear`, `jira` and `notion` read finished work from a tracker (read-only, with a token from
   * the environment). Default `changelog` if a file exists, else `git`.
   */
  source?: "changelog" | "git" | "github" | "gitlab" | "linear" | "jira" | "notion";
  /** Linear: team key (e.g. `ENG`). Every completed cycle becomes a release. `LINEAR_API_KEY`. @beta */
  linear?: { team: string } & TrackerOptions;
  /** Jira Cloud: site URL and project key. Every released version becomes a release. `JIRA_EMAIL` and `JIRA_API_TOKEN`. @beta */
  jira?: { url: string; project: string; includeUnreleased?: boolean } & TrackerOptions;
  /** Notion: database id. Pages are grouped by their `Version` property. `NOTION_TOKEN`. @beta */
  notion?: { database: string } & ParseNotionOptions;
  /** GitHub: `owner/name`. Uses the `GITHUB_TOKEN` environment variable when set. */
  repo?: string;
  /** GitLab: project path (`group/name`) or numeric id. Uses `GITLAB_TOKEN` when set. */
  project?: string;
  /** GitLab: base URL of a self-managed instance. Default `https://gitlab.com`. */
  gitlabUrl?: string;
  /** GitHub and GitLab: include pre-releases (GitLab: upcoming releases). */
  includePrereleases?: boolean;
  /**
   * Monorepos: keep only releases of these packages. A trailing `*` matches a prefix, so
   * `@acme/*` takes every package in the scope.
   */
  packages?: string[];
  /** Monorepos: drop releases of these packages (same patterns). Applied after `packages`. */
  excludePackages?: string[];
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
  /** Format of `changelog.json`. Default 2; `1` for widgets still on 1.x. */
  feedFormat?: 1 | 2;
  /** Public URL of the full changelog page. */
  link?: string;
  limit?: number;
  /** Titles, summaries, media and links written by a person, keyed by version. */
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

/** Reads published releases of a GitLab project, newest first (up to 300). */
export async function readGitLabReleases(
  project: string,
  options: { token?: string; fetch?: typeof fetch; baseUrl?: string } = {},
): Promise<GitLabRelease[]> {
  if (!/^(\d+|[\w.-]+(\/[\w.-]+)+)$/.test(project) || /(^|\/)\.+(\/|$)/.test(project)) {
    throw new Error(`"${project}" is not a GitLab project path like group/name or a numeric id.`);
  }
  const doFetch = options.fetch ?? fetch;
  const token = options.token ?? process.env.GITLAB_TOKEN;
  const base = (options.baseUrl ?? "https://gitlab.com").replace(/\/$/, "");
  const all: GitLabRelease[] = [];
  for (let page = 1; page <= 3; page++) {
    const response = await doFetch(
      `${base}/api/v4/projects/${encodeURIComponent(project)}/releases?per_page=100&page=${page}`,
      {
        headers: { "user-agent": "derivative", ...(token ? { "private-token": token } : {}) },
      },
    );
    if (!response.ok) {
      throw new Error(
        `GitLab API ${response.status} for ${project}${token ? "" : " (set GITLAB_TOKEN for private projects)"}`,
      );
    }
    const batch = (await response.json()) as GitLabRelease[];
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all;
}

async function failIfNotOk(response: Response, what: string, hint: string): Promise<void> {
  if (!response.ok) throw new Error(`${what} answered ${response.status}${hint}`);
}

/** Reads the newest completed cycles of a Linear team (up to 50). @beta */
export async function readLinearCycles(
  team: string,
  options: { token?: string; fetch?: typeof fetch; apiUrl?: string } = {},
): Promise<LinearCycle[]> {
  const token = options.token ?? process.env.LINEAR_API_KEY;
  if (!token) throw new Error("Set LINEAR_API_KEY to read Linear.");
  const response = await (options.fetch ?? fetch)(
    options.apiUrl ?? "https://api.linear.app/graphql",
    {
      method: "POST",
      headers: { "content-type": "application/json", authorization: token },
      body: JSON.stringify({ query: LINEAR_CYCLES_QUERY, variables: { team, first: 50 } }),
    },
  );
  await failIfNotOk(response, "Linear", " (check LINEAR_API_KEY and the team key)");
  const body = (await response.json()) as {
    data?: { cycles?: { nodes: LinearCycle[] } };
    errors?: { message: string }[];
  };
  if (body.errors?.length) throw new Error(`Linear: ${body.errors[0]?.message}`);
  return body.data?.cycles?.nodes ?? [];
}

/** Reads released versions of a Jira Cloud project (newest 20) with their issues. @beta */
export async function readJiraVersions(
  site: string,
  project: string,
  options: {
    email?: string;
    token?: string;
    fetch?: typeof fetch;
    includeUnreleased?: boolean;
  } = {},
): Promise<{ version: JiraVersion; issues: JiraIssue[] }[]> {
  if (!/^[A-Z][A-Z0-9_]+$/i.test(project))
    throw new Error(`"${project}" is not a Jira project key.`);
  const email = options.email ?? process.env.JIRA_EMAIL;
  const token = options.token ?? process.env.JIRA_API_TOKEN;
  if (!email || !token) throw new Error("Set JIRA_EMAIL and JIRA_API_TOKEN to read Jira.");
  const base = site.replace(/\/$/, "");
  const doFetch = options.fetch ?? fetch;
  const headers = {
    accept: "application/json",
    authorization: `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`,
  };
  const versionsResponse = await doFetch(`${base}/rest/api/3/project/${project}/versions`, {
    headers,
  });
  await failIfNotOk(
    versionsResponse,
    "Jira",
    " (check JIRA_EMAIL, JIRA_API_TOKEN and the project key)",
  );
  const all = (await versionsResponse.json()) as (JiraVersion & { id?: string })[];
  const versions = all
    .filter((v) => options.includeUnreleased || v.released)
    .sort((a, b) => (b.releaseDate ?? "").localeCompare(a.releaseDate ?? ""))
    .slice(0, 20);
  const out: { version: JiraVersion; issues: JiraIssue[] }[] = [];
  for (const version of versions) {
    const jql = `project = ${project} AND fixVersion = "${version.name.replace(/"/g, '\\"')}"`;
    const response = await doFetch(
      `${base}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&fields=summary,issuetype,labels&maxResults=100`,
      { headers },
    );
    await failIfNotOk(response, "Jira", "");
    out.push({
      version,
      issues: ((await response.json()) as { issues: JiraIssue[] }).issues ?? [],
    });
  }
  return out;
}

/** Reads the pages of a Notion database (up to 300). @beta */
export async function readNotionPages(
  database: string,
  options: { token?: string; fetch?: typeof fetch; apiUrl?: string } = {},
): Promise<NotionPage[]> {
  if (!/^[0-9a-f-]{32,36}$/i.test(database))
    throw new Error(`"${database}" is not a Notion database id.`);
  const token = options.token ?? process.env.NOTION_TOKEN;
  if (!token) throw new Error("Set NOTION_TOKEN to read Notion.");
  const api = options.apiUrl ?? "https://api.notion.com";
  const pages: NotionPage[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < 3; i++) {
    const response = await (options.fetch ?? fetch)(`${api}/v1/databases/${database}/query`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "notion-version": "2022-06-28",
        "content-type": "application/json",
      },
      body: JSON.stringify({ page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) }),
    });
    await failIfNotOk(response, "Notion", " (share the database with your integration)");
    const body = (await response.json()) as {
      results: NotionPage[];
      has_more?: boolean;
      next_cursor?: string | null;
    };
    pages.push(...body.results);
    if (!body.has_more || !body.next_cursor) break;
    cursor = body.next_cursor;
  }
  return pages;
}

/** True when `name` matches one of the patterns (`*` at the end matches a prefix). */
export function matchesPackage(name: string | undefined, patterns: string[]): boolean {
  if (!name) return false;
  return patterns.some((p) => (p.endsWith("*") ? name.startsWith(p.slice(0, -1)) : name === p));
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
    ((await exists(resolve(cwd, files[0] ?? "")))
      ? "changelog"
      : config.repo
        ? "github"
        : config.project
          ? "gitlab"
          : "git");
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
  } else if (source === "gitlab") {
    if (!config.project) throw new Error('source "gitlab" needs "project", e.g. "group/app".');
    releases = parseGitLabReleases(
      await readGitLabReleases(config.project, { baseUrl: config.gitlabUrl }),
      { includePrereleases: config.includePrereleases },
    );
  } else if (source === "linear") {
    if (!config.linear?.team) throw new Error('source "linear" needs linear.team, e.g. "ENG".');
    releases = parseLinearCycles(await readLinearCycles(config.linear.team), config.linear);
  } else if (source === "jira") {
    if (!config.jira?.url || !config.jira.project) {
      throw new Error('source "jira" needs jira.url and jira.project.');
    }
    releases = parseJiraVersions(
      await readJiraVersions(config.jira.url, config.jira.project, {
        includeUnreleased: config.jira.includeUnreleased,
      }),
      { ...config.jira, baseUrl: config.jira.url },
    );
  } else if (source === "notion") {
    if (!config.notion?.database) throw new Error('source "notion" needs notion.database.');
    releases = parseNotionPages(await readNotionPages(config.notion.database), config.notion);
  } else {
    const template = config.commitUrl;
    releases = parseCommits(await readGitCommits(cwd), {
      types: config.types,
      tagPattern: config.tagPattern ? new RegExp(config.tagPattern) : undefined,
      includeUnreleased: config.includeUnreleased,
      commitUrl: template ? (hash) => template.replace("{hash}", hash) : undefined,
    });
  }

  if (config.packages?.length) {
    const keep = config.packages;
    releases = releases.filter((r) => matchesPackage(r.package, keep));
  }
  if (config.excludePackages?.length) {
    const drop = config.excludePackages;
    releases = releases.filter((r) => !matchesPackage(r.package, drop));
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
  await write(
    out.json,
    `${JSON.stringify(config.feedFormat === 1 ? toFeedV1(feed) : feed, null, 2)}\n`,
  );
  await write(out.atom, renderAtom(feed, { lang: config.lang, selfUrl: config.atomUrl }));
  await write(out.html, renderPage(feed, { lang: config.lang }));
  await write(
    out.jsonFeed,
    renderJsonFeed(feed, { lang: config.lang, selfUrl: config.jsonFeedUrl }),
  );
  return written;
}
