import { createFeed } from "@sweberdev/derivative";
import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChangelogList, useChangelog, WhatsNew } from "../src";

const feed = createFeed(
  [
    {
      id: "2.0.0",
      version: "2.0.0",
      date: "2026-10-01",
      entries: [{ type: "feature", text: "New <b>thing</b>" }],
    },
    { id: "1.0.0", version: "1.0.0", date: "2026-01-01", entries: [{ type: "fix", text: "Old" }] },
  ],
  { generatedAt: null },
);

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-05"));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useChangelog", () => {
  it("loads a feed and tracks unread releases", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(feed))),
    );
    const { result } = renderHook(() => useChangelog({ src: "/changelog.json" }));
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.unread.map((r) => r.id)).toEqual(["2.0.0"]);
    act(() => result.current.markAllRead());
    expect(result.current.unread).toEqual([]);
    expect(localStorage.getItem("derivative:last-seen")).toBe("2.0.0");
  });

  it("reports load errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 500 })),
    );
    const { result } = renderHook(() => useChangelog({ src: "/x.json" }));
    await waitFor(() => expect(result.current.status).toBe("error"));
  });
});

describe("ChangelogList", () => {
  it("renders escaped entries", () => {
    const { container } = render(<ChangelogList releases={feed.releases} lang="de" />);
    expect(container.querySelectorAll(".dv-release")).toHaveLength(2);
    expect(container.querySelector("b")).toBeNull();
    expect(container.textContent).toContain("New <b>thing</b>");
  });
});

describe("WhatsNew", () => {
  it("renders the web component with a feed", async () => {
    const onRead = vi.fn();
    const { container } = render(<WhatsNew feed={feed} label="Updates" onRead={onRead} />);
    const element = container.querySelector("derivative-widget") as HTMLElement & { show(): void };
    await waitFor(() => expect(element.shadowRoot?.textContent).toContain("Updates"));
    act(() => element.show());
    expect(onRead).toHaveBeenCalledWith("2.0.0");
    expect(screen.queryByText("Updates")).toBeNull(); // lives in shadow DOM, not the light DOM
  });
});
