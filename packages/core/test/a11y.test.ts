import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import { createFeed, type Feed } from "../src";
import { type DerivativeWidget, defineDerivativeWidget } from "../src/widget";

defineDerivativeWidget();

const feed: Feed = createFeed(
  [
    {
      id: "2.0.0",
      version: "2.0.0",
      date: "2026-10-01",
      title: "Dark mode",
      summary: "Switch in **settings**.",
      entries: [
        { type: "feature", text: "Dark mode", scope: "ui", link: "https://example.com/pr/1" },
        { type: "breaking", text: "Removed `legacy` option", details: "Use `modern` instead." },
      ],
    },
    { id: "1.0.0", version: "1.0.0", date: "2026-09-01", entries: [{ type: "fix", text: "Bug" }] },
  ],
  { link: "/changelog", generatedAt: null },
);

function mount(attrs: Record<string, string> = {}): DerivativeWidget {
  const el = document.createElement("derivative-widget") as DerivativeWidget;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.innerHTML = "<main><h1>App</h1></main>";
  document.body.append(el);
  el.feed = feed;
  return el;
}

// jsdom has no layout or colour, so those rules cannot run here.
const options = { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } };

async function violations() {
  const results = await axe.run(document.body, options);
  return results.violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.html.slice(0, 80)).join(" | ")}`,
  );
}

afterEach(() => {
  document.body.innerHTML = "";
  localStorage.clear();
});

describe("accessibility (axe)", () => {
  it("closed popover has no violations", async () => {
    mount({ announce: "", lang: "de" });
    expect(await violations()).toEqual([]);
  });

  it("open popover with search has no violations", async () => {
    mount({ search: "" }).show();
    expect(await violations()).toEqual([]);
  });

  it("inline list has no violations", async () => {
    mount({ mode: "inline", search: "", lang: "fr" });
    expect(await violations()).toEqual([]);
  });

  it("toast has no violations", async () => {
    mount({ announce: "" });
    expect(
      document.querySelector("derivative-widget")?.shadowRoot?.querySelector(".toast"),
    ).not.toBeNull();
    expect(await violations()).toEqual([]);
  });
});
