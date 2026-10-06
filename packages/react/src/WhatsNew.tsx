import type { EntryType, Feed, Messages } from "@sweberdev/derivative";
import { type DerivativeWidget, defineDerivativeWidget } from "@sweberdev/derivative/widget/define";
import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";

export interface WhatsNewProps {
  /** URL of `changelog.json`. */
  src?: string;
  /** Pass a feed directly instead of `src`. */
  feed?: Feed;
  lang?: string;
  mode?: "popover" | "inline";
  limit?: number;
  storageKey?: string;
  /** Link to the full changelog. Defaults to the feed's `link`. */
  href?: string;
  /** Button text and panel title. */
  label?: string;
  align?: "start" | "end";
  theme?: "light" | "dark";
  /** Show only these entry types, e.g. `["feature", "fix"]`. */
  types?: EntryType[];
  /** Show a toast once when a new release with a title arrives. */
  announce?: boolean;
  /** Add a search field to the panel. */
  search?: boolean;
  /** Monorepo feeds: show only these packages. A trailing `*` matches a prefix. */
  packages?: string[];
  messages?: Partial<Messages>;
  className?: string;
  style?: CSSProperties;
  /** Replaces the bell icon. */
  icon?: ReactNode;
  onOpen?: () => void;
  onRead?: (lastSeen: string) => void;
}

/** The `<derivative-widget>` web component as a React component. */
export function WhatsNew(props: WhatsNewProps) {
  const ref = useRef<DerivativeWidget>(null);
  const { feed, messages, onOpen, onRead, icon } = props;

  useEffect(() => defineDerivativeWidget(), []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.messages = messages;
    if (feed) element.feed = feed;
  }, [feed, messages]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const open = () => onOpen?.();
    const read = (event: Event) =>
      onRead?.((event as CustomEvent<{ lastSeen: string }>).detail.lastSeen);
    element.addEventListener("derivative-open", open);
    element.addEventListener("derivative-read", read);
    return () => {
      element.removeEventListener("derivative-open", open);
      element.removeEventListener("derivative-read", read);
    };
  }, [onOpen, onRead]);

  return (
    <derivative-widget
      ref={ref}
      src={feed ? undefined : props.src}
      lang={props.lang}
      mode={props.mode}
      limit={props.limit === undefined ? undefined : String(props.limit)}
      storage-key={props.storageKey}
      href={props.href}
      label={props.label}
      align={props.align}
      theme={props.theme}
      types={props.types?.join(",")}
      announce={props.announce ? "" : undefined}
      search={props.search ? "" : undefined}
      package={props.packages?.join(",")}
      className={props.className}
      style={props.style}
    >
      {icon ? <span slot="icon">{icon}</span> : null}
    </derivative-widget>
  );
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "derivative-widget": React.DetailedHTMLProps<
        React.HTMLAttributes<DerivativeWidget>,
        DerivativeWidget
      > & {
        src?: string;
        mode?: string;
        limit?: string;
        "storage-key"?: string;
        href?: string;
        label?: string;
        align?: string;
        theme?: string;
        types?: string;
        announce?: string;
        search?: string;
        package?: string;
      };
    }
  }
}
