import { ENTRY_TYPES, type Entry, type Feed, type Highlights, type Release } from "./types";

export interface CreateFeedOptions {
  title?: string;
  link?: string;
  /** Keep only the newest releases. */
  limit?: number;
  highlights?: Highlights;
  /** Defaults to now. Pass `null` to leave it out (stable output for tests and diffs). */
  generatedAt?: string | null;
}

/** Combines releases from one or more sources into a sorted, deduplicated feed. */
export function createFeed(releases: Release[], options: CreateFeedOptions = {}): Feed {
  const merged = new Map<string, Release>();
  for (const release of releases) {
    const key = release.package ? `${release.package}@${release.id}` : release.id;
    const existing = merged.get(key);
    if (existing) {
      existing.entries.push(...release.entries);
      existing.date ??= release.date;
    } else {
      merged.set(key, { ...release, entries: [...release.entries] });
    }
  }

  let list = [...merged.values()]
    .map((release) => {
      const extra = options.highlights?.[release.id];
      return { ...release, ...extra, entries: sortEntries(release.entries) };
    })
    .filter((release) => release.entries.length > 0 || release.title || release.summary);
  list = sortReleases(list);
  if (options.limit !== undefined) list = list.slice(0, options.limit);

  const feed: Feed = { version: 1, releases: list };
  if (options.title) feed.title = options.title;
  if (options.link) feed.link = options.link;
  if (options.generatedAt !== null)
    feed.generatedAt = options.generatedAt ?? new Date().toISOString();
  return feed;
}

/** Newest first: by date when both have one, otherwise by version, otherwise input order. */
export function sortReleases(releases: Release[]): Release[] {
  return releases
    .map((release, index) => ({ release, index }))
    .sort((a, b) => {
      const da = a.release.date ? Date.parse(a.release.date) : Number.NaN;
      const db = b.release.date ? Date.parse(b.release.date) : Number.NaN;
      if (!Number.isNaN(da) && !Number.isNaN(db) && da !== db) return db - da;
      if (a.release.version && b.release.version) {
        const byVersion = compareVersions(b.release.version, a.release.version);
        if (byVersion !== 0) return byVersion;
      }
      return a.index - b.index;
    })
    .map(({ release }) => release);
}

function sortEntries(entries: Entry[]): Entry[] {
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort(
      (a, b) =>
        ENTRY_TYPES.indexOf(a.entry.type) - ENTRY_TYPES.indexOf(b.entry.type) || a.index - b.index,
    )
    .map(({ entry }) => entry);
}

/** Compares semver-like versions. Pre-releases sort before their release. */
export function compareVersions(a: string, b: string): number {
  const parse = (v: string) => {
    const [core = "", pre] = (v.replace(/^v/, "").split("+")[0] ?? "").split(/-(.*)/s);
    return { parts: core.split(".").map((n) => Number.parseInt(n, 10) || 0), pre };
  };
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < Math.max(pa.parts.length, pb.parts.length); i++) {
    const diff = (pa.parts[i] ?? 0) - (pb.parts[i] ?? 0);
    if (diff !== 0) return Math.sign(diff);
  }
  if (pa.pre === pb.pre) return 0;
  if (pa.pre === undefined) return 1;
  if (pb.pre === undefined) return -1;
  return pa.pre.localeCompare(pb.pre, "en", { numeric: true });
}

/**
 * Checks untrusted JSON (e.g. a fetched `changelog.json`) and returns a feed with only known fields.
 * Throws with a readable message when the shape is wrong.
 */
export function parseFeed(input: unknown): Feed {
  if (!isObject(input) || input.version !== 1 || !Array.isArray(input.releases)) {
    throw new Error("Not a Derivative feed: expected { version: 1, releases: [...] }.");
  }
  const releases = input.releases.map((value, i): Release => {
    if (!isObject(value) || !Array.isArray(value.entries)) {
      throw new Error(`Release ${i} has no entries array.`);
    }
    const id = str(value.id) ?? str(value.version);
    if (!id) throw new Error(`Release ${i} has no id.`);
    const entries = value.entries.flatMap((e): Entry[] => {
      if (!isObject(e) || !str(e.text)) return [];
      const type = ENTRY_TYPES.includes(e.type as never) ? (e.type as Entry["type"]) : "other";
      return [
        clean({
          type,
          text: str(e.text) ?? "",
          details: str(e.details),
          scope: str(e.scope),
          link: safeUrl(str(e.link)),
        }),
      ];
    });
    return clean({
      id,
      version: str(value.version),
      date: str(value.date),
      package: str(value.package),
      title: str(value.title),
      summary: str(value.summary),
      image: safeUrl(str(value.image)),
      entries,
    });
  });
  return clean({
    version: 1 as const,
    title: str(input.title),
    link: safeUrl(str(input.link)),
    generatedAt: str(input.generatedAt),
    releases,
  });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

/** Allows http(s), mailto and relative URLs; drops `javascript:` and friends. */
export function safeUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !/^(https?|mailto):/i.test(trimmed)) return undefined;
  return trimmed;
}

function clean<T extends object>(value: T): T {
  for (const key of Object.keys(value) as (keyof T)[]) {
    if (value[key] === undefined) delete value[key];
  }
  return value;
}
