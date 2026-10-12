import {
  ENTRY_TYPES,
  type Entry,
  type Feed,
  type Highlights,
  type Media,
  type Release,
  type ReleaseLink,
  type ReleaseTranslation,
} from "./types";

export interface CreateFeedOptions {
  title?: string;
  link?: string;
  /** Keep only the newest releases. */
  limit?: number;
  highlights?: Highlights;
  /** Defaults to now. Pass `null` to leave it out (stable output for tests and diffs). */
  generatedAt?: string | null;
  /** Format of the result. Default 2; `1` writes the older format for widgets still on 1.x. */
  format?: 1 | 2;
}

/** The feed format 1.x widgets read: no media, links, audiences, translations or ids. */
export interface FeedV1 {
  version: 1;
  title?: string;
  link?: string;
  generatedAt?: string;
  releases: (Omit<
    Release,
    "media" | "links" | "importance" | "audience" | "translations" | "entries"
  > & {
    image?: string;
    entries: Omit<Entry, "id" | "audience" | "target">[];
  })[];
}

/** Combines releases from one or more sources into a sorted, deduplicated feed. */
export function createFeed(releases: Release[], options: CreateFeedOptions & { format: 1 }): FeedV1;
export function createFeed(releases: Release[], options?: CreateFeedOptions & { format?: 2 }): Feed;
export function createFeed(releases: Release[], options: CreateFeedOptions = {}): Feed | FeedV1 {
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

  const feed: Feed = { version: 2, releases: list };
  if (options.title) feed.title = options.title;
  if (options.link) feed.link = options.link;
  if (options.generatedAt !== null)
    feed.generatedAt = options.generatedAt ?? new Date().toISOString();
  return options.format === 1 ? toFeedV1(feed) : feed;
}

/** Converts a feed to the format 1.x widgets read. Fields that format cannot hold are dropped. */
export function toFeedV1(feed: Feed): FeedV1 {
  const releases = feed.releases.map((release) => {
    const { media, links: _l, importance: _i, audience: _a, translations: _t, ...rest } = release;
    const image = media?.find((m) => m.type === "image")?.url;
    return clean({
      ...rest,
      image,
      entries: release.entries.map(({ id: _id, audience: _au, target: _ta, ...entry }) => entry),
    });
  });
  return clean({
    version: 1 as const,
    title: feed.title,
    link: feed.link,
    generatedAt: feed.generatedAt,
    releases,
  });
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
 * Checks untrusted JSON (e.g. a fetched `changelog.json`) and returns a feed in format 2 with only
 * known fields. Format 1 files are accepted and converted (`image` becomes `media`).
 * Throws with a readable message when the shape is wrong.
 */
export function parseFeed(input: unknown): Feed {
  if (
    !isObject(input) ||
    (input.version !== 1 && input.version !== 2) ||
    !Array.isArray(input.releases)
  ) {
    throw new Error("Not a Derivative feed: expected { version: 2, releases: [...] }.");
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
          id: str(e.id),
          audience: strings(e.audience),
          target: str(e.target),
        }),
      ];
    });
    const media = parseMedia(value.media);
    const legacyImage = safeUrl(str(value.image));
    if (legacyImage && !media.some((m) => m.url === legacyImage)) {
      media.unshift({ type: "image", url: legacyImage, alt: "" });
    }
    return clean({
      id,
      version: str(value.version),
      date: str(value.date),
      package: str(value.package),
      title: str(value.title),
      summary: str(value.summary),
      media: media.length ? media : undefined,
      links: parseLinks(value.links),
      importance: value.importance === "major" ? ("major" as const) : undefined,
      audience: strings(value.audience),
      translations: parseTranslations(value.translations),
      entries,
    });
  });
  return clean({
    version: 2 as const,
    title: str(input.title),
    link: safeUrl(str(input.link)),
    generatedAt: str(input.generatedAt),
    releases,
  });
}

/**
 * The release with title, summary and entry texts taken from `translations` for `lang` (exact
 * match, then the language without region). Returns the release itself when there is none.
 */
export function localizeRelease(release: Release, lang: string | undefined): Release {
  if (!lang || !release.translations) return release;
  const t =
    release.translations[lang] ?? release.translations[lang.split("-")[0]?.toLowerCase() ?? ""];
  if (!t) return release;
  return {
    ...release,
    ...(t.title ? { title: t.title } : {}),
    ...(t.summary ? { summary: t.summary } : {}),
    entries: release.entries.map((entry) => {
      const text = entry.id ? t.entries?.[entry.id] : undefined;
      return text ? { ...entry, text } : entry;
    }),
  };
}

function parseMedia(value: unknown): Media[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((m): Media[] => {
    if (!isObject(m)) return [];
    const url = safeUrl(str(m.url));
    if (!url || (m.type !== "image" && m.type !== "video")) return [];
    return [clean({ type: m.type, url, alt: typeof m.alt === "string" ? m.alt : undefined })];
  });
}

function parseLinks(value: unknown): ReleaseLink[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const links = value.flatMap((l): ReleaseLink[] => {
    if (!isObject(l)) return [];
    const url = safeUrl(str(l.url));
    const label = str(l.label);
    return url && label ? [{ label, url }] : [];
  });
  return links.length ? links : undefined;
}

function parseTranslations(value: unknown): Record<string, ReleaseTranslation> | undefined {
  if (!isObject(value)) return undefined;
  const out: Record<string, ReleaseTranslation> = {};
  for (const [lang, t] of Object.entries(value)) {
    if (!isObject(t) || !/^[a-z]{2,3}(-[A-Za-z0-9]+)*$/.test(lang)) continue;
    const entries = isObject(t.entries)
      ? Object.fromEntries(
          Object.entries(t.entries).filter((pair): pair is [string, string] => !!str(pair[1])),
        )
      : undefined;
    out[lang] = clean({
      title: str(t.title),
      summary: str(t.summary),
      entries: entries && Object.keys(entries).length ? entries : undefined,
    });
  }
  return Object.keys(out).length ? out : undefined;
}

function strings(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const list = value.filter((v): v is string => typeof v === "string" && v.trim() !== "");
  return list.length ? list : undefined;
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
