import { createFeed } from "@sweberdev/derivative";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, h, nextTick } from "vue";
import { useChangelog, WhatsNew } from "../src";

const feed = createFeed(
  [
    {
      id: "2.0.0",
      version: "2.0.0",
      date: "2026-10-01",
      title: "Big",
      entries: [{ type: "feature", text: "Dark mode" }],
    },
    { id: "1.0.0", version: "1.0.0", date: "2026-09-01", entries: [{ type: "fix", text: "Bug" }] },
  ],
  { generatedAt: null },
);

function mount(component: ReturnType<typeof h> | object, props: Record<string, unknown> = {}) {
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp(component as never, props);
  app.mount(root);
  return { root, app };
}

afterEach(() => {
  document.body.innerHTML = "";
  localStorage.clear();
});

describe("<WhatsNew>", () => {
  it("renders the widget element with attributes and a feed", async () => {
    const { root } = mount(WhatsNew, {
      feed,
      lang: "de",
      types: ["feature"],
      search: true,
      limit: 5,
      headingLevel: 4,
    });
    await nextTick();
    const el = root.querySelector("derivative-widget") as HTMLElement & { feed?: unknown };
    expect(el.getAttribute("lang")).toBe("de");
    expect(el.getAttribute("types")).toBe("feature");
    expect(el.getAttribute("limit")).toBe("5");
    expect(el.getAttribute("heading-level")).toBe("4");
    expect(el.hasAttribute("search")).toBe(true);
    expect(el.hasAttribute("announce")).toBe(false);
    expect(el.feed).toBeTruthy();
  });

  it("emits open and read", async () => {
    const onOpen = vi.fn();
    const onRead = vi.fn();
    const { root } = mount(WhatsNew, { feed, onOpen, onRead });
    await nextTick();
    const el = root.querySelector("derivative-widget") as HTMLElement & { show(): void };
    el.show();
    expect(onOpen).toHaveBeenCalledOnce();
    expect(onRead).toHaveBeenCalledWith("2.0.0");
  });
});

describe("useChangelog", () => {
  it("tracks unread releases and marks them read", async () => {
    let state!: ReturnType<typeof useChangelog>;
    mount({
      setup() {
        state = useChangelog({ feed });
        return () => h("div");
      },
    });
    await nextTick();
    expect(state.status.value).toBe("ready");
    expect(state.unread.value).toHaveLength(1);
    state.markAllRead();
    await nextTick();
    expect(state.unread.value).toHaveLength(0);
  });
});
