import type { Feed, Release } from "./types";

export interface UnreadOptions {
  /**
   * For first-time readers (nothing seen yet): count releases from the last N days.
   * Releases without a date count once. Default 30.
   */
  firstVisitDays?: number;
  now?: Date;
}

/** Releases the reader has not seen yet, newest first. `lastSeen` is a release key. */
export function getUnread(
  feed: Feed,
  lastSeen: string | null | undefined,
  options: UnreadOptions = {},
): Release[] {
  if (lastSeen) {
    const index = feed.releases.findIndex((r) => releaseKey(r) === lastSeen);
    // Unknown key (release removed or renamed): don't flood the reader with old news.
    return index === -1 ? [] : feed.releases.slice(0, index);
  }
  const days = options.firstVisitDays ?? 30;
  const cutoff = (options.now ?? new Date()).getTime() - days * 86_400_000;
  const recent = feed.releases.filter((r) => r.date && Date.parse(r.date) >= cutoff);
  if (recent.length > 0) return recent;
  return feed.releases.slice(0, 1).filter((r) => !r.date);
}

/** Key used to remember a release. Includes the package in monorepo feeds. */
export function releaseKey(release: Release): string {
  return release.package ? `${release.package}@${release.id}` : release.id;
}

/** Key of the newest release, to store once the reader has seen everything. */
export function latestKey(feed: Feed): string | null {
  const first = feed.releases[0];
  return first ? releaseKey(first) : null;
}

/** Remembers the last seen release in `localStorage`. Every call is safe when storage is blocked. */
export function createStore(key = "derivative:last-seen") {
  return {
    get(): string | null {
      try {
        return globalThis.localStorage?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    set(value: string | null): void {
      try {
        if (value === null) globalThis.localStorage?.removeItem(key);
        else globalThis.localStorage?.setItem(key, value);
      } catch {
        // Private mode or blocked storage: the badge simply shows again next time.
      }
    },
  };
}
