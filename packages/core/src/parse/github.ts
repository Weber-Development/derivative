import type { Release } from "../types";
import { DEFAULT_COMMIT_TYPES } from "./commits";
import { capitalize, parseChangelog } from "./markdown";

/** The fields Derivative reads from the GitHub REST API `GET /repos/{owner}/{repo}/releases`. */
export interface GitHubRelease {
  tag_name: string;
  name?: string | null;
  body?: string | null;
  published_at?: string | null;
  html_url?: string;
  draft?: boolean;
  prerelease?: boolean;
}

export interface ParseGitHubReleasesOptions {
  /** Include pre-releases. Default `false`. */
  includePrereleases?: boolean;
  /** Attached to every release. */
  package?: string;
}

const CONVENTIONAL = /^(\w+)(?:\(([^)]+)\))?(!)?:\s+(.+)$/;

/**
 * Turns GitHub releases into feed releases. Release bodies can be hand-written Markdown with
 * `### Features`-style headings or GitHub's generated notes ("What's Changed").
 */
export function parseGitHubReleases(
  releases: GitHubRelease[],
  options: ParseGitHubReleasesOptions = {},
): Release[] {
  return releases
    .filter((r) => !r.draft && (options.includePrereleases || !r.prerelease))
    .flatMap((gh): Release[] => {
      const version = /v?(\d+\.\d+(?:\.\d+)?(?:-[\w.]+)?)/.exec(gh.tag_name)?.[1];
      const id = version ?? gh.tag_name;
      const body = cleanBody(gh.body ?? "");
      const parsed = parseChangelog(`## ${id}\n\n${body}`)[0];
      const release: Release = { id, entries: [] };
      if (version) release.version = version;
      if (gh.published_at) release.date = gh.published_at;
      if (options.package) release.package = options.package;
      const name = gh.name?.trim();
      if (name && name !== gh.tag_name && name.replace(/^v/, "") !== id) release.title = name;
      release.entries = (parsed?.entries ?? []).map((entry) => {
        if (entry.type !== "other") return entry;
        // Generated notes list PR titles; many follow conventional commits.
        const match = CONVENTIONAL.exec(entry.text.replace(/^\w/, (c) => c.toLowerCase()));
        if (!match) return entry;
        const [, kind = "", scope, bang, text = ""] = match;
        const type = bang ? "breaking" : DEFAULT_COMMIT_TYPES[kind.toLowerCase()];
        if (!type) return entry;
        const next = { ...entry, type, text: capitalize(text) };
        if (scope) next.scope = scope;
        return next;
      });
      if (release.entries.length === 0 && !release.title && gh.html_url) {
        release.summary = `[${gh.html_url.replace(/^https?:\/\//, "")}](${gh.html_url})`;
      }
      return [release];
    });
}

function cleanBody(body: string): string {
  const lines = body.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  let skipping = false;
  for (const line of lines) {
    const heading = /^#{1,6}\s+(.+?)\s*$/.exec(line);
    if (heading) {
      skipping = /^new contributors$/i.test(heading[1] ?? "");
      // Keep headings below the release heading the parser adds.
      if (!skipping) out.push(`### ${heading[1]}`);
      continue;
    }
    if (skipping || /^\*\*full changelog\*\*/i.test(line.trim())) continue;
    // Generated notes: "* Add export by @octocat in https://github.com/o/r/pull/12"
    const generated = /^([-*]\s+.*?)\s+by\s+@[\w-]+(?:\[bot\])?\s+in\s+(https:\/\/\S+)\s*$/.exec(
      line,
    );
    out.push(generated ? `${generated[1]} ([#](${generated[2]}))` : line);
  }
  return out.join("\n");
}
