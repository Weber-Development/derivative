import type { Entry, EntryType, Release } from "../types";
import { ENTRY_TYPES } from "../types";

/** Maps issue labels or types (lower case) to entry types. */
export type TypeMap = Record<string, EntryType>;

export const DEFAULT_TRACKER_TYPES: TypeMap = {
  feature: "feature",
  "new feature": "feature",
  story: "feature",
  improvement: "improvement",
  enhancement: "improvement",
  task: "improvement",
  bug: "fix",
  fix: "fix",
  defect: "fix",
  security: "security",
  breaking: "breaking",
  deprecation: "deprecated",
  deprecated: "deprecated",
  removal: "removed",
  removed: "removed",
};

/** Labels that keep an issue out of the changelog. */
export const DEFAULT_EXCLUDED_LABELS = ["internal", "no-changelog", "skip-changelog"];

/** An issue as the tracker parsers see it, whichever tracker it came from. */
export interface TrackerIssue {
  key: string;
  title: string;
  url?: string;
  /** Issue type (Jira) or null. */
  kind?: string | null;
  labels?: string[];
  description?: string | null;
}

export interface TrackerOptions {
  /** Extra or overriding mappings from label/type to entry type. */
  types?: TypeMap;
  /** Issues with one of these labels are left out. Default `internal`, `no-changelog`, `skip-changelog`. */
  excludeLabels?: string[];
  /** Entry type for issues that match nothing. Default `improvement`. */
  fallback?: EntryType;
}

/** `audience:pro` labels become the entry's audience; the label itself is not a type. */
const AUDIENCE = /^audience:(.+)$/i;

/** Turns one issue into an entry, or undefined when it is excluded. */
export function issueEntry(issue: TrackerIssue, options: TrackerOptions = {}): Entry | undefined {
  const map = { ...DEFAULT_TRACKER_TYPES, ...lowerKeys(options.types) };
  const exclude = new Set((options.excludeLabels ?? DEFAULT_EXCLUDED_LABELS).map(lower));
  const labels = (issue.labels ?? []).map((l) => l.trim()).filter(Boolean);
  if (labels.some((l) => exclude.has(lower(l)))) return undefined;
  const audience = labels.flatMap((l) => {
    const match = AUDIENCE.exec(l);
    return match?.[1] ? [lower(match[1].trim())] : [];
  });
  const candidates = [...labels.filter((l) => !AUDIENCE.test(l)), issue.kind ?? ""].map(lower);
  const type =
    candidates.map((c) => map[c]).find((t): t is EntryType => !!t && ENTRY_TYPES.includes(t)) ??
    options.fallback ??
    "improvement";
  const text = issue.title.trim();
  if (!text) return undefined;
  return {
    type,
    text,
    id: issue.key,
    ...(issue.url ? { link: issue.url } : {}),
    ...(audience.length ? { audience } : {}),
  };
}

export function issuesRelease(
  head: Pick<Release, "id" | "version" | "date" | "title" | "summary" | "package">,
  issues: TrackerIssue[],
  options: TrackerOptions,
): Release | undefined {
  const entries = issues.flatMap((i) => issueEntry(i, options) ?? []);
  if (entries.length === 0) return undefined;
  const release: Release = { id: head.id, entries };
  for (const key of ["version", "date", "title", "summary", "package"] as const) {
    if (head[key]) release[key] = head[key];
  }
  return release;
}

const lower = (s: string) => s.toLowerCase();

function lowerKeys(map: TypeMap | undefined): TypeMap {
  return Object.fromEntries(Object.entries(map ?? {}).map(([k, v]) => [lower(k), v]));
}
