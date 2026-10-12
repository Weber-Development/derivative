import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFeed, type Feed } from "../src";
import { type DerivativeWidget, defineDerivativeWidget } from "../src/widget";

defineDerivativeWidget();

const feed: Feed = createFeed(
  [
    {
      id: "2.1.0",
      version: "2.1.0",
      date: "2026-10-03",
      title: "Small things",
      summary: "Some polish.",
      entries: [{ type: "improvement", text: "Faster" }],
    },
    {
      id: "2.0.0",
      version: "2.0.0",
      date: "2026-10-01",
      title: "Dark mode",
      summary: "Switch it on under **Settings**.\n\nSecond paragraph.",
      importance: "major",
      media: [{ type: "image", url: "https://acme.ch/dark.png", alt: "Dark dashboard" }],
      links: [{ label: "Read the guide", url: "https://acme.ch/guide" }],
      translations: {
        de: { title: "Dunkelmodus", summary: "Unter **Einstellungen** einschalten." },
      },
      entries: [
        { type: "feature", text: "Dark mode", id: "A-1", target: "#theme-switch" },
        { type: "feature", text: "Pro export", id: "A-2", audience: ["pro"] },
      ],
    },
  ],
  { generatedAt: null },
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
});

describe("highlight", () => {
  it("prefers a major release over a newer minor one", () => {
    const el = mount({ highlight: "" });
    el.feed = feed;
    expect(shadow(el).querySelector(".highlight")?.textContent).toContain("Dark mode");
    expect(shadow(el).querySelector('.highlight[data-kind="toast"]')).not.toBeNull();
  });

  it("shows a modal with the full text, image and links, and closes with Escape", () => {
    const el = mount({ highlight: "modal" });
    el.feed = feed;
    const modal = shadow(el).querySelector<HTMLElement>('.highlight[data-kind="modal"]');
    expect(modal?.getAttribute("role")).toBe("dialog");
    expect(modal?.getAttribute("aria-modal")).toBe("true");
    expect(modal?.textContent).toContain("Second paragraph.");
    expect(modal?.querySelector("img")?.getAttribute("alt")).toBe("Dark dashboard");
    expect(modal?.querySelector("a")?.getAttribute("href")).toBe("https://acme.ch/guide");
    expect(shadow(el).querySelector(".backdrop")).not.toBeNull();
    modal?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(shadow(el).querySelector(".highlight")).toBeNull();
    expect(shadow(el).querySelector(".backdrop")).toBeNull();
    // Dismissing is remembered, reading is not implied.
    expect((shadow(el).querySelector(".badge") as HTMLElement).hidden).toBe(false);
  });

  it("dismisses the modal by clicking the backdrop", () => {
    const el = mount({ highlight: "modal" });
    el.feed = feed;
    (shadow(el).querySelector(".backdrop") as HTMLElement).click();
    expect(shadow(el).querySelector(".highlight")).toBeNull();
  });

  it("shows a banner without media", () => {
    const el = mount({ highlight: "banner" });
    el.feed = feed;
    const banner = shadow(el).querySelector('.highlight[data-kind="banner"]');
    expect(banner).not.toBeNull();
    expect(banner?.querySelector("img")).toBeNull();
    expect(shadow(el).querySelector(".backdrop")).toBeNull();
  });

  it("ignores the removed announce attribute", () => {
    const el = mount({ announce: "" });
    el.feed = feed;
    expect(shadow(el).querySelector(".highlight")).toBeNull();
  });

  it("uses the translated title for the language", () => {
    const el = mount({ highlight: "", lang: "de" });
    el.feed = feed;
    expect(shadow(el).querySelector(".highlight")?.textContent).toContain("Dunkelmodus");
  });

  it("emits derivative-highlight with the release key", () => {
    const seen = vi.fn();
    const el = mount({ highlight: "modal" });
    el.addEventListener("derivative-highlight", seen);
    el.feed = feed;
    expect(seen).toHaveBeenCalledOnce();
    expect(((seen.mock.calls[0]?.[0] ?? new CustomEvent("x")) as CustomEvent).detail).toEqual({
      release: "2.0.0",
    });
  });
});

describe("audience", () => {
  it("hides audience-only entries from readers outside the audience", () => {
    const el = mount();
    el.feed = feed;
    el.show();
    expect(shadow(el).querySelector(".list")?.textContent).not.toContain("Pro export");
  });

  it("shows them to the matching audience, case-insensitively", () => {
    const el = mount({ audience: "Beta, PRO" });
    el.feed = feed;
    el.show();
    expect(shadow(el).querySelector(".list")?.textContent).toContain("Pro export");
  });

  it("hides whole releases and does not count them as unread", () => {
    const only = createFeed(
      [
        {
          id: "1.0.0",
          version: "1.0.0",
          audience: ["admin"],
          entries: [{ type: "feature", text: "Admin only" }],
        },
      ],
      { generatedAt: null },
    );
    const el = mount();
    el.feed = only;
    expect(el.unreadCount).toBe(0);
    const admin = mount({ audience: "admin" });
    admin.feed = only;
    expect(admin.unreadCount).toBe(1);
  });
});

describe("hints", () => {
  it("marks the target element while an entry is unread and clears it when read", () => {
    document.body.innerHTML = '<button id="theme-switch">Theme</button>';
    const el = mount({ hints: "" });
    document.body.append(el);
    el.feed = feed;
    const target = document.getElementById("theme-switch");
    expect(target?.getAttribute("data-derivative-hint")).toBe("feature");
    el.show();
    expect(target?.hasAttribute("data-derivative-hint")).toBe(false);
  });

  it("does nothing without the attribute and survives invalid selectors", () => {
    document.body.innerHTML = '<button id="theme-switch">Theme</button>';
    const el = mount();
    el.feed = feed;
    expect(document.getElementById("theme-switch")?.hasAttribute("data-derivative-hint")).toBe(
      false,
    );
    const bad = mount({ hints: "" });
    bad.feed = createFeed([{ id: "1", entries: [{ type: "fix", text: "x", target: "###" }] }], {
      generatedAt: null,
    });
    expect(bad.unreadCount).toBe(1);
  });
});

describe("media and links in the list", () => {
  it("renders them in the panel", () => {
    const el = mount();
    el.feed = feed;
    el.show();
    const list = shadow(el).querySelector(".list") as HTMLElement;
    expect(list.querySelector("img.dv-image")?.getAttribute("alt")).toBe("Dark dashboard");
    expect(list.querySelector("a.dv-action")?.textContent).toBe("Read the guide");
  });
});
