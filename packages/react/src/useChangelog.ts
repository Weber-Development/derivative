import {
  createStore,
  type Feed,
  getUnread,
  latestKey,
  parseFeed,
  type Release,
} from "@sweberdev/derivative";
import { useCallback, useEffect, useMemo, useState } from "react";

export interface UseChangelogOptions {
  /** URL of `changelog.json`. */
  src?: string;
  /** Use an already loaded feed instead of `src`. */
  feed?: Feed;
  /** `localStorage` key for the last seen release. */
  storageKey?: string;
}

export interface ChangelogState {
  status: "loading" | "ready" | "error";
  feed: Feed | undefined;
  releases: Release[];
  unread: Release[];
  error: unknown;
  /** Remember the newest release as seen; clears `unread`. */
  markAllRead: () => void;
}

/** Loads a Derivative feed and tracks which releases the reader has not seen yet. */
export function useChangelog(options: UseChangelogOptions): ChangelogState {
  const { src, feed: given, storageKey = "derivative:last-seen" } = options;
  const store = useMemo(() => createStore(storageKey), [storageKey]);
  const [loaded, setLoaded] = useState<Feed>();
  const [error, setError] = useState<unknown>();
  // Read storage after mount so server and first client render agree.
  const [lastSeen, setLastSeen] = useState<string | null | undefined>(undefined);

  useEffect(() => setLastSeen(store.get()), [store]);

  useEffect(() => {
    if (given || !src) return;
    const abort = new AbortController();
    setError(undefined);
    fetch(src, { signal: abort.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
        return response.json();
      })
      .then((json) => setLoaded(parseFeed(json)))
      .catch((reason: unknown) => {
        if (!abort.signal.aborted) setError(reason);
      });
    return () => abort.abort();
  }, [src, given]);

  const feed = useMemo(() => (given ? parseFeed(given) : loaded), [given, loaded]);
  const unread = useMemo(
    () => (feed && lastSeen !== undefined ? getUnread(feed, lastSeen) : []),
    [feed, lastSeen],
  );

  const markAllRead = useCallback(() => {
    if (!feed) return;
    const key = latestKey(feed);
    store.set(key);
    setLastSeen(key);
  }, [feed, store]);

  return {
    status: error ? "error" : feed ? "ready" : "loading",
    feed,
    releases: feed?.releases ?? [],
    unread,
    error,
    markAllRead,
  };
}
