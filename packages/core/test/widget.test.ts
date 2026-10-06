import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFeed, type Feed } from "../src";
import { type DerivativeWidget, defineDerivativeWidget } from "../src/widget";

defineDerivativeWidget();

const feed: Feed = createFeed(
  [
    {
      id: "2.0.0",
      version: "2.0.0",
      date: "2026-10-01",
      entries: [{ type: "feature", text: "**Dark** mode" }],
    },
    { id: "1.0.0", version: "1.0.0", date: "2026-09-01", entries: [{ type: "fix", text: "Bug" }] },
  ],
  { link: "/changelog", generatedAt: null },
);

function mount(attrs: Record<string, string> = {}): DerivativeWidget {
  const el = document.createElement("derivative-widget") as DerivativeWidget;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.append(el);
  return el;
}

const shadow = (el: HTMLElement) => el.shadowRoot as ShadowRoot;

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-05"));
});
afterEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("<derivative-widget>", () => {
  it("shows an unread badge and clears it when opened", () => {
    const el = mount({ lang: "de" });
    el.feed = feed;
    const button = shadow(el).querySelector("button.trigger") as HTMLButtonElement;
    const badge = shadow(el).querySelector(".badge") as HTMLElement;
    expect(button.textContent).toContain("Neuigkeiten");
    expect(badge.hidden).toBe(false);
    expect(badge.textContent).toBe("1");

    const read = vi.fn();
    el.addEventListener("derivative-read", read);
    button.click();
    expect(el.open).toBe(true);
    const panel = shadow(el).querySelector(".panel") as HTMLElement;
    expect(panel.hidden).toBe(false);
    expect(shadow(el).activeElement).toBe(panel);
    expect(panel.innerHTML).toContain("<strong>Dark</strong> mode");
    expect(panel.querySelector("[data-unread]")?.id).toBe("2-0-0");
    expect(read).toHaveBeenCalledWith(expect.objectContaining({ detail: { lastSeen: "2.0.0" } }));
    expect(localStorage.getItem("derivative:last-seen")).toBe("2.0.0");
    expect((shadow(el).querySelector(".badge") as HTMLElement).hidden).toBe(true);
    expect(panel.querySelector("a.all")?.getAttribute("href")).toBe("/changelog");
  });

  it("closes on Escape and returns focus", () => {
    const el = mount();
    el.feed = feed;
    el.show();
    const panel = shadow(el).querySelector(".panel") as HTMLElement;
    panel.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(el.open).toBe(false);
    expect(shadow(el).activeElement).toBe(shadow(el).querySelector(".trigger"));
    expect(shadow(el).querySelector(".trigger")?.getAttribute("aria-expanded")).toBe("false");
  });

  it("closes on a click outside", () => {
    const el = mount();
    el.feed = feed;
    el.show();
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(el.open).toBe(false);
  });

  it("loads src and renders inline", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(feed))),
    );
    const el = mount({ src: "/changelog.json", mode: "inline", limit: "1" });
    await vi.waitFor(() => expect(shadow(el).querySelectorAll(".dv-release")).toHaveLength(1));
    expect(fetch).toHaveBeenCalledWith("/changelog.json", expect.anything());
    expect(shadow(el).querySelector("button")).toBeNull();
    expect(localStorage.getItem("derivative:last-seen")).toBe("2.0.0");
  });

  it("shows an error when the feed cannot be loaded", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 404 })),
    );
    const el = mount({ src: "/missing.json", mode: "inline" });
    await vi.waitFor(() => expect(shadow(el).textContent).toContain("could not be loaded"));
  });
});

describe("types and announce", () => {
  const titled: Feed = createFeed(
    [
      {
        id: "3.0.0",
        version: "3.0.0",
        date: "2026-10-04",
        title: "Dark mode is here",
        summary: "Switch in **settings**.",
        entries: [
          { type: "feature", text: "Dark mode" },
          { type: "fix", text: "Typo" },
        ],
      },
      {
        id: "2.9.1",
        version: "2.9.1",
        date: "2026-10-02",
        entries: [{ type: "fix", text: "Crash" }],
      },
    ],
    { generatedAt: null },
  );

  it("shows only the listed entry types and drops empty releases", () => {
    const el = mount({ types: "feature" });
    el.feed = titled;
    el.show();
    const list = shadow(el).querySelector(".list") as HTMLElement;
    expect(list.textContent).toContain("Dark mode");
    expect(list.textContent).not.toContain("Typo");
    expect(list.querySelectorAll(".dv-release")).toHaveLength(1);
    expect(list.querySelector("[data-unread]")).not.toBeNull();
  });

  it("announces a new titled release once", () => {
    const announced = vi.fn();
    const el = mount({ announce: "", lang: "de" });
    el.addEventListener("derivative-announce", announced);
    el.feed = titled;
    const toast = shadow(el).querySelector(".toast") as HTMLElement;
    expect(toast.textContent).toContain("Dark mode is here");
    expect(toast.innerHTML).toContain("<strong>settings</strong>");
    expect(announced).toHaveBeenCalledOnce();

    (shadow(el).querySelector(".toast-dismiss") as HTMLButtonElement).click();
    expect(shadow(el).querySelector(".toast")).toBeNull();
    // The badge stays: dismissing is not reading.
    expect((shadow(el).querySelector(".badge") as HTMLElement).hidden).toBe(false);

    const again = mount({ announce: "" });
    again.feed = titled;
    expect(shadow(again).querySelector(".toast")).toBeNull();
  });

  it("opens the panel from the toast", () => {
    const el = mount({ announce: "" });
    el.feed = titled;
    (shadow(el).querySelector(".toast-show") as HTMLButtonElement).click();
    expect(el.open).toBe(true);
    expect(shadow(el).querySelector(".toast")).toBeNull();
  });

  it("does not announce without the attribute", () => {
    const el = mount();
    el.feed = titled;
    expect(shadow(el).querySelector(".toast")).toBeNull();
  });
});

describe("search", () => {
  const many: Feed = createFeed(
    [
      {
        id: "3.0.0",
        version: "3.0.0",
        date: "2026-10-04",
        entries: [{ type: "feature", text: "Dark mode", scope: "ui" }],
      },
      {
        id: "2.0.0",
        version: "2.0.0",
        date: "2026-10-02",
        entries: [{ type: "fix", text: "Crash on export", details: "Happened with **CSV**." }],
      },
      {
        id: "1.0.0",
        version: "1.0.0",
        date: "2026-09-01",
        entries: [{ type: "fix", text: "Typo" }],
      },
    ],
    { generatedAt: null },
  );

  function type(el: HTMLElement, value: string) {
    const input = shadow(el).querySelector(".search") as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event("input"));
    return input;
  }

  it("adds no field without the attribute", () => {
    const el = mount({ mode: "inline" });
    el.feed = many;
    expect(shadow(el).querySelector(".search")).toBeNull();
  });

  it("filters releases as you type, across text, details, scope and version", () => {
    const el = mount({ mode: "inline", search: "", limit: "1" });
    el.feed = many;
    const list = () => shadow(el).querySelectorAll(".dv-release").length;
    expect(list()).toBe(1);
    type(el, "csv");
    expect(list()).toBe(1);
    expect(shadow(el).querySelector(".list")?.textContent).toContain("Crash on export");
    type(el, "UI");
    expect(shadow(el).querySelector(".list")?.textContent).toContain("Dark mode");
    // The limit applies to the unfiltered list only.
    type(el, "fix");
    type(el, "o");
    expect(list()).toBe(3);
    type(el, "1.0.0");
    expect(list()).toBe(1);
  });

  it("keeps the field (and focus target) when nothing matches", () => {
    const el = mount({ mode: "inline", search: "", lang: "de" });
    el.feed = many;
    const input = type(el, "zzz");
    expect(shadow(el).querySelector(".list")?.textContent).toContain("Nichts gefunden.");
    expect(shadow(el).querySelector(".search")).toBe(input);
  });

  it("works in the popover and keeps the query when reopened", () => {
    const el = mount({ search: "" });
    el.feed = many;
    el.show();
    type(el, "typo");
    expect(shadow(el).querySelectorAll(".dv-release").length).toBe(1);
    el.hide();
    el.show();
    expect((shadow(el).querySelector(".search") as HTMLInputElement).value).toBe("typo");
  });
});

describe("derivative-render", () => {
  it("fires after the list is drawn, in the popover only while open", () => {
    const el = mount();
    const seen = vi.fn();
    el.addEventListener("derivative-render", (e) => seen((e as CustomEvent).detail.list.className));
    el.feed = feed;
    expect(seen).not.toHaveBeenCalled();
    el.show();
    expect(seen).toHaveBeenCalledWith("list");
  });

  it("fires for inline lists and again after a search", () => {
    const el = mount({ mode: "inline", search: "" });
    const seen = vi.fn();
    el.addEventListener("derivative-render", seen);
    el.feed = feed;
    expect(seen).toHaveBeenCalledTimes(1);
    const input = shadow(el).querySelector(".search") as HTMLInputElement;
    input.value = "bug";
    input.dispatchEvent(new Event("input"));
    expect(seen).toHaveBeenCalledTimes(2);
  });
});
