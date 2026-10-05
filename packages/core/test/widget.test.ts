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
