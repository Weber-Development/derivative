import type { Entry, EntryType, Release } from "../types";
import { capitalize } from "./markdown";

export interface Commit {
  hash: string;
  /** ISO 8601 commit date. */
  date: string;
  subject: string;
  body?: string;
  /** Tags pointing at this commit, e.g. `["v1.2.0"]`. */
  tags?: string[];
}

export interface ParseCommitsOptions {
  /**
   * Commit types to keep and how to show them. Anything else is left out.
   * Default: feat, fix, perf, security, revert, deprecate.
   */
  types?: Record<string, EntryType>;
  /** Only tags matching this pattern start a release. Default: tags that contain a version. */
  tagPattern?: RegExp;
  /** Keep commits newer than the latest tag as an "unreleased" release. Default `false`. */
  includeUnreleased?: boolean;
  /** Turns a hash into a link, e.g. `(h) => \`https://github.com/acme/app/commit/${h}\``. */
  commitUrl?: (hash: string) => string;
  /** Attached to every release. */
  package?: string;
}

export const DEFAULT_COMMIT_TYPES: Record<string, EntryType> = {
  feat: "feature",
  fix: "fix",
  perf: "improvement",
  security: "security",
  revert: "other",
  deprecate: "deprecated",
};

const HEADER = /^(\w+)(?:\(([^)]+)\))?(!)?:\s+(.+)$/;
const SKIP = /\[(skip changelog|changelog skip|internal)\]/i;

/** Groups conventional commits (newest first, as `git log` prints them) into releases by tag. */
export function parseCommits(commits: Commit[], options: ParseCommitsOptions = {}): Release[] {
  const types = options.types ?? DEFAULT_COMMIT_TYPES;
  const tagPattern = options.tagPattern ?? /\d+\.\d+/;
  const releases: Release[] = [];
  let current: Release | undefined = options.includeUnreleased
    ? { id: "unreleased", entries: [] }
    : undefined;
  if (current) releases.push(current);

  for (const commit of commits) {
    const tag = commit.tags?.find((t) => tagPattern.test(t));
    if (tag) {
      const version = versionFromTag(tag);
      current = { id: version, version, date: commit.date, entries: [] };
      if (options.package) current.package = options.package;
      releases.push(current);
    }
    if (!current) continue;
    const entry = commitToEntry(commit, types, options.commitUrl);
    if (entry) current.entries.push(entry);
  }
  return releases.filter((r) => r.entries.length > 0);
}

function commitToEntry(
  commit: Commit,
  types: Record<string, EntryType>,
  commitUrl?: (hash: string) => string,
): Entry | undefined {
  const header = HEADER.exec(commit.subject.trim());
  if (!header) return undefined;
  const [, kind = "", scope, bang, description = ""] = header;
  const body = commit.body ?? "";
  if (SKIP.test(commit.subject) || SKIP.test(body)) return undefined;
  const breakingNote = /^BREAKING[ -]CHANGE:\s*(.+)/m.exec(body)?.[1];
  const breaking = Boolean(bang) || Boolean(breakingNote);
  const mapped = types[kind.toLowerCase()];
  if (!mapped && !breaking) return undefined;

  const entry: Entry = {
    type: breaking ? "breaking" : (mapped ?? "other"),
    text: capitalize(description.replace(/\s*\(#\d+\)$/, "").trim()),
  };
  if (scope) entry.scope = scope;
  if (breakingNote) entry.details = breakingNote.trim();
  if (commitUrl) entry.link = commitUrl(commit.hash);
  return entry;
}

/** `v1.2.0` → `1.2.0`, `@acme/app@1.2.0` → `1.2.0`. */
export function versionFromTag(tag: string): string {
  return /v?(\d+\.\d+(?:\.\d+)?(?:-[\w.]+)?)$/.exec(tag)?.[1] ?? tag;
}
