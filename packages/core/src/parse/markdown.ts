import type { Entry, EntryType, Release } from "../types";

export interface ParseChangelogOptions {
  /** Package name to attach to every release. Defaults to the `# heading` of a Changesets file. */
  package?: string;
  /** Include `## [Unreleased]` sections. Default `false`. */
  includeUnreleased?: boolean;
}

const HEADING_TYPES: Record<string, EntryType> = {
  "major changes": "breaking",
  "minor changes": "feature",
  "patch changes": "fix",
  added: "feature",
  features: "feature",
  changed: "improvement",
  improvements: "improvement",
  "performance improvements": "improvement",
  fixed: "fix",
  "bug fixes": "fix",
  removed: "removed",
  deprecated: "deprecated",
  security: "security",
  "breaking changes": "breaking",
};

/**
 * Parses a `CHANGELOG.md` written by Changesets, by semantic-release / conventional-changelog,
 * or in the Keep a Changelog style.
 */
export function parseChangelog(markdown: string, options: ParseChangelogOptions = {}): Release[] {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const releases: Release[] = [];
  let pkg = options.package;
  let release: Release | undefined;
  let skip = false;
  let type: EntryType = "other";
  let entry: Entry | undefined;
  let detail: string[] = [];

  const flushEntry = () => {
    if (entry && release && !skip) {
      const details = detail.join("\n").trim();
      if (details) entry.details = details;
      if (!isDependencyNoise(entry.text)) release.entries.push(entry);
    }
    entry = undefined;
    detail = [];
  };

  for (const line of lines) {
    const h1 = /^#\s+(.+?)\s*$/.exec(line);
    if (h1 && !release && !options.package) {
      const name = h1[1] ?? "";
      if (!/^change ?log$/i.test(name)) pkg = name;
      continue;
    }

    const h2 = /^#{1,2}\s+(.+?)\s*$/.exec(line);
    if (h2 && !/^###/.test(line)) {
      flushEntry();
      const heading = parseReleaseHeading(h2[1] ?? "");
      if (!heading) continue;
      skip = heading.unreleased && !options.includeUnreleased;
      release = { id: heading.version, entries: [] };
      if (!heading.unreleased) release.version = heading.version;
      if (heading.date) release.date = heading.date;
      if (pkg) release.package = pkg;
      if (!skip) releases.push(release);
      type = "other";
      continue;
    }

    const h3 = /^#{3,4}\s+(.+?)\s*$/.exec(line);
    if (h3) {
      flushEntry();
      const name = (h3[1] ?? "")
        .replace(/[^\p{L}\s]/gu, "")
        .trim()
        .toLowerCase();
      type = HEADING_TYPES[name] ?? "other";
      continue;
    }

    const bullet = /^[-*]\s+(.*)$/.exec(line);
    if (bullet && release) {
      flushEntry();
      const { text, link, scope, breaking } = cleanBullet(bullet[1] ?? "");
      entry = { type: breaking ? "breaking" : type, text };
      if (scope) entry.scope = scope;
      if (link) entry.link = link;
      continue;
    }

    if (entry) {
      if (/^\s{2,}[-*]\s/.test(line) && isDependencyNoise(entry.text)) continue;
      detail.push(line.replace(/^ {2}/, ""));
    }
  }
  flushEntry();
  return releases;
}

function parseReleaseHeading(
  raw: string,
): { version: string; date?: string; unreleased: boolean } | undefined {
  // "[1.2.0] - 2026-10-01", "1.2.0 (2026-10-01)", "[1.2.0](compare-url) (2026-10-01)", "v1.2.0"
  const text = raw.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/^\[|\](?=\s|$)/g, "");
  if (/^unreleased\b/i.test(text)) return { version: "unreleased", unreleased: true };
  const version = /^v?(\d+\.\d+(?:\.\d+)?(?:-[\w.]+)?)/.exec(text)?.[1];
  if (!version) return undefined;
  const date = /(\d{4}-\d{2}-\d{2})/.exec(text)?.[1];
  return date ? { version, date, unreleased: false } : { version, unreleased: false };
}

function cleanBullet(raw: string): {
  text: string;
  link?: string;
  scope?: string;
  breaking: boolean;
} {
  let text = raw.trim();
  let link: string | undefined;

  // @changesets/changelog-github: "[#12](pr) [`abc1234`](commit) Thanks [@me](user)! - Text"
  const github = /^((?:\[[^\]]*\]\([^)]*\)\s*)+)(?:Thanks\s.*?!\s*)?-\s+(.*)$/s.exec(text);
  if (github) {
    link = /\]\(([^)]+)\)/.exec(github[1] ?? "")?.[1];
    text = github[2] ?? "";
  }
  // @changesets/cli default: "abc1234: Text"
  text = text.replace(/^[0-9a-f]{7,40}:\s+/, "");
  // conventional-changelog: "**scope:** text ([abc1234](url))"
  let scope: string | undefined;
  const scoped = /^\*\*([^*]+?):\*\*\s+(.*)$/.exec(text);
  if (scoped) {
    scope = scoped[1];
    text = scoped[2] ?? "";
  }
  const trailing = /\s*\((?:\[[^\]]+\]\(([^)]+)\)(?:,\s*)?)+\)\s*$/.exec(text);
  if (trailing) {
    link ??= trailing[1];
    text = text.slice(0, trailing.index);
  }
  const breaking = /^\*\*breaking( change)?:?\*\*:?\s*/i.test(text);
  if (breaking) text = text.replace(/^\*\*breaking( change)?:?\*\*:?\s*/i, "");
  return { text: capitalize(text.trim()), link, scope, breaking };
}

function isDependencyNoise(text: string): boolean {
  return /^updated dependencies\b/i.test(text);
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
