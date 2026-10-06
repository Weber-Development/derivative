import {
  createStore,
  type EntryType,
  type Feed,
  getUnread,
  latestKey,
  type Messages,
  parseFeed,
  type Release,
} from "@sweberdev/derivative";
import { type DerivativeWidget, defineDerivativeWidget } from "@sweberdev/derivative/widget/define";
import {
  computed,
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  type PropType,
  type Ref,
  ref,
  shallowRef,
  watch,
} from "vue";

/**
 * The `<derivative-widget>` web component as a Vue 3 component.
 *
 * ```vue
 * <WhatsNew src="/changelog.json" lang="de" announce search @read="onRead" />
 * ```
 */
export const WhatsNew = defineComponent({
  name: "WhatsNew",
  props: {
    /** URL of `changelog.json`. */
    src: String,
    /** Pass a feed directly instead of `src`. */
    feed: Object as PropType<Feed>,
    lang: String,
    mode: String as PropType<"popover" | "inline">,
    limit: Number,
    storageKey: String,
    /** Link to the full changelog. Defaults to the feed's `link`. */
    href: String,
    /** Button text and panel title. */
    label: String,
    align: String as PropType<"start" | "end">,
    theme: String as PropType<"light" | "dark">,
    /** Show only these entry types, e.g. `["feature", "fix"]`. */
    types: Array as PropType<EntryType[]>,
    /** Show a toast once when a new release with a title arrives. */
    announce: Boolean,
    /** Add a search field to the panel. */
    search: Boolean,
    /** Monorepo feeds: show only these packages. A trailing `*` matches a prefix. */
    packages: Array as PropType<string[]>,
    /** Level of the release headings, 2 to 6. Default 3 in the panel, 2 for `mode="inline"`. */
    headingLevel: Number as PropType<2 | 3 | 4 | 5 | 6>,
    /** Override any UI text. */
    messages: Object as PropType<Partial<Messages>>,
  },
  emits: {
    open: () => true,
    read: (_lastSeen: string) => true,
  },
  setup(props, { emit, slots }) {
    const el = ref<DerivativeWidget | null>(null);

    onMounted(() => {
      defineDerivativeWidget();
    });

    const sync = () => {
      const element = el.value;
      if (!element) return;
      element.messages = props.messages;
      if (props.feed) element.feed = props.feed;
    };
    watch([() => props.feed, () => props.messages, el], sync, { flush: "post" });

    const onOpen = () => emit("open");
    const onRead = (event: Event) =>
      emit("read", (event as CustomEvent<{ lastSeen: string }>).detail.lastSeen);

    return () =>
      h(
        "derivative-widget",
        {
          ref: el,
          src: props.feed ? undefined : props.src,
          lang: props.lang,
          mode: props.mode,
          limit: props.limit === undefined ? undefined : String(props.limit),
          "storage-key": props.storageKey,
          href: props.href,
          label: props.label,
          align: props.align,
          theme: props.theme,
          types: props.types?.join(","),
          announce: props.announce ? "" : undefined,
          search: props.search ? "" : undefined,
          package: props.packages?.join(","),
          "heading-level":
            props.headingLevel === undefined ? undefined : String(props.headingLevel),
          onDerivativeOpen: onOpen,
          "onDerivative-read": onRead,
        },
        slots.icon ? [h("span", { slot: "icon" }, slots.icon())] : undefined,
      );
  },
});

export interface UseChangelogOptions {
  /** URL of `changelog.json`. */
  src?: string;
  /** Use an already loaded feed instead of `src`. */
  feed?: Feed;
  /** `localStorage` key for the last seen release. */
  storageKey?: string;
}

export interface ChangelogState {
  status: Ref<"loading" | "ready" | "error">;
  feed: Ref<Feed | undefined>;
  releases: Ref<Release[]>;
  unread: Ref<Release[]>;
  error: Ref<unknown>;
  /** Remember the newest release as seen; clears `unread`. */
  markAllRead: () => void;
}

/** Loads a Derivative feed and tracks which releases the reader has not seen yet. */
export function useChangelog(options: UseChangelogOptions): ChangelogState {
  const storageKey = options.storageKey ?? "derivative:last-seen";
  const store = createStore(storageKey);
  const loaded = shallowRef<Feed>();
  const error = ref<unknown>();
  // Read storage after mount so server and first client render agree.
  const lastSeen = ref<string | null | undefined>(undefined);
  let abort: AbortController | undefined;

  onMounted(() => {
    lastSeen.value = store.get();
    if (options.feed || !options.src) return;
    abort = new AbortController();
    fetch(options.src, { signal: abort.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
        return response.json();
      })
      .then((json) => {
        loaded.value = parseFeed(json);
      })
      .catch((reason: unknown) => {
        if (!abort?.signal.aborted) error.value = reason;
      });
  });
  onBeforeUnmount(() => abort?.abort());

  const feed = computed(() => (options.feed ? parseFeed(options.feed) : loaded.value));
  const unread = computed(() =>
    feed.value && lastSeen.value !== undefined ? getUnread(feed.value, lastSeen.value) : [],
  );
  const releases = computed(() => feed.value?.releases ?? []);
  const status = computed(() => (error.value ? "error" : feed.value ? "ready" : "loading"));

  const markAllRead = () => {
    if (!feed.value) return;
    const key = latestKey(feed.value);
    store.set(key);
    lastSeen.value = key;
  };

  return { status, feed, releases, unread, error, markAllRead };
}

export type { EntryType, Feed, Messages, Release };
