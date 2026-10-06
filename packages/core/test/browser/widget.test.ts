import { existsSync, readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { createRequire } from "node:module";
import type { AddressInfo } from "node:net";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Result } from "axe-core";
import { type Browser, chromium, type Page } from "playwright-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, "../../dist");
const axeSource = readFileSync(
  createRequire(import.meta.url).resolve("axe-core/axe.min.js"),
  "utf8",
);

const feed = {
  version: 1,
  title: "Acme",
  link: "/changelog",
  generatedAt: null,
  releases: [
    {
      id: "2.0.0",
      version: "2.0.0",
      date: new Date(Date.now() - 86_400_000).toISOString(),
      title: "Dark mode",
      summary: "Switch in **settings**.",
      entries: [
        { type: "feature", text: "Dark mode", scope: "ui", link: "https://example.com/pr/1" },
        { type: "breaking", text: "Removed `legacy` option", details: "Use `modern` instead." },
        { type: "security", text: "Tighter cookie settings" },
        { type: "deprecated", text: "Old export format" },
      ],
    },
    {
      id: "1.0.0",
      version: "1.0.0",
      date: "2026-09-01T00:00:00Z",
      entries: [
        { type: "fix", text: "Rounding bug" },
        { type: "improvement", text: "Faster start" },
      ],
    },
  ],
};

const mime: Record<string, string> = { ".js": "text/javascript", ".json": "application/json" };

function page(attrs: string, dir = "ltr", scheme = "") {
  return `<!doctype html><html lang="en" dir="${dir}" ${scheme}><head><meta charset="utf-8"><title>t</title></head>
<body style="margin:0;font-family:sans-serif"><header style="height:48px;display:flex;justify-content:flex-end;padding:8px">
<derivative-widget src="/changelog.json" ${attrs}></derivative-widget></header><main><h1>App</h1></main>
<script type="module">import "/widget-auto.js";</script></body></html>`;
}

let server: Server;
let base = "";
let browser: Browser | undefined;
const pages: Record<string, string> = {};

const executablePath =
  process.env.DERIVATIVE_CHROMIUM ?? process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? undefined;

beforeAll(async () => {
  if (!existsSync(join(dist, "widget.js"))) throw new Error("Run `pnpm build` first.");
  server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://x");
    if (url.pathname === "/changelog.json") {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify(feed));
    } else if (pages[url.pathname]) {
      res.setHeader("content-type", "text/html");
      res.end(pages[url.pathname]);
    } else if (/^\/[\w.-]+\.js$/.test(url.pathname) && existsSync(join(dist, url.pathname))) {
      res.setHeader("content-type", mime[extname(url.pathname)] ?? "text/plain");
      res.end(readFileSync(join(dist, url.pathname)));
    } else {
      res.statusCode = 404;
      res.end();
    }
  });
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  browser = await chromium.launch({
    ...(executablePath ? { executablePath } : {}),
    args: ["--no-sandbox"],
  });
});

afterAll(async () => {
  await browser?.close();
  server?.close();
});

async function open(
  path: string,
  html: string,
  options: Parameters<Browser["newContext"]>[0] = {},
) {
  pages[path] = html;
  const context = await (browser as Browser).newContext(options);
  const p = await context.newPage();
  await p.goto(`${base}${path}`);
  await p.waitForSelector("derivative-widget");
  await p.waitForFunction(
    () =>
      (document.querySelector("derivative-widget") as { unreadCount?: number })?.unreadCount !==
      undefined,
  );
  return p;
}

async function contrast(p: Page) {
  // Callers use reduced motion: mid-animation colours are blended with the background.
  await p.addScriptTag({ content: axeSource });
  return p.evaluate(async () => {
    // @ts-expect-error axe is injected above
    const r = await axe.run(document.body, { runOnly: ["color-contrast"] });
    return r.violations.flatMap((v: Result) =>
      v.nodes.map((n) => `${n.target}: ${n.any[0]?.message}`),
    );
  });
}

describe("widget in Chromium", () => {
  it("opens the panel, shows the badge and keeps focus handling", async () => {
    const p = await open("/basic", page(""));
    const button = p.locator("derivative-widget >> role=button").first();
    await button.waitFor();
    expect(
      await p.evaluate(
        () =>
          (document.querySelector("derivative-widget") as unknown as { unreadCount: number })
            .unreadCount,
      ),
    ).toBe(1);
    await button.click();
    const panel = p.locator("derivative-widget >> role=dialog");
    await panel.waitFor();
    expect(await panel.isVisible()).toBe(true);
    expect(await p.locator("derivative-widget >> text=Dark mode").first().isVisible()).toBe(true);
    await p.keyboard.press("Escape");
    await panel.waitFor({ state: "hidden" });
    expect(await p.evaluate(() => document.activeElement?.tagName)).toBe("DERIVATIVE-WIDGET");
    await p.context().close();
  });

  it("keeps the panel inside the viewport on a phone", async () => {
    const p = await open("/phone", page(""), { viewport: { width: 360, height: 640 } });
    await p.locator("derivative-widget >> role=button").first().click();
    const box = await p.locator("derivative-widget >> role=dialog").boundingBox();
    expect(box).not.toBeNull();
    expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(360);
    await p.context().close();
  });

  it.each(["light", "dark"] as const)(
    "has sufficient colour contrast in %s mode",
    async (scheme) => {
      const p = await open(`/contrast-${scheme}`, page(`search announce`), {
        colorScheme: scheme,
        reducedMotion: "reduce",
      });
      await p.locator("derivative-widget >> role=button").first().click();
      await p.locator("derivative-widget >> role=dialog").waitFor();
      expect(await contrast(p)).toEqual([]);
      await p.context().close();
    },
  );

  it("has sufficient contrast when theme is forced against the system setting", async () => {
    const p = await open("/forced", page(`theme="dark"`), {
      colorScheme: "light",
      reducedMotion: "reduce",
    });
    await p.locator("derivative-widget >> role=button").first().click();
    await p.locator("derivative-widget >> role=dialog").waitFor();
    expect(await contrast(p)).toEqual([]);
    await p.context().close();
  });

  it("filters while typing in the search field", async () => {
    const p = await open("/search", page('search mode="inline"'));
    await p.locator("derivative-widget >> input").first().fill("rounding");
    await p.waitForFunction(() =>
      document
        .querySelector("derivative-widget")
        ?.shadowRoot?.textContent?.includes("Rounding bug"),
    );
    expect(await p.locator("derivative-widget >> text=Dark mode").count()).toBe(0);
    await p.context().close();
  });

  it("opens towards the start in right-to-left pages without leaving the viewport", async () => {
    const p = await open("/rtl", page(`align="end"`, "rtl"), {
      viewport: { width: 400, height: 700 },
    });
    await p.locator("derivative-widget >> role=button").first().click();
    const box = await p.locator("derivative-widget >> role=dialog").boundingBox();
    expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(400);
    await p.context().close();
  });

  it("skips the opening animation with reduced motion", async () => {
    const p = await open("/motion", page(""), { reducedMotion: "reduce" });
    await p.locator("derivative-widget >> role=button").first().click();
    const animations = await p.evaluate(
      () =>
        (
          document
            .querySelector("derivative-widget")
            ?.shadowRoot?.querySelector("[part=panel]") as HTMLElement
        )?.getAnimations().length,
    );
    expect(animations ?? 0).toBe(0);
    await p.context().close();
  });

  it("follows custom properties and ::part() rules from the page", async () => {
    const themed = page("").replace(
      "</head>",
      `<style>derivative-widget{--dv-button-radius:4px;--dv-accent:rgb(1, 2, 3);--dv-z:77}
derivative-widget::part(entry){outline:3px solid rgb(9, 8, 7)}
derivative-widget::part(release-title){letter-spacing:5px}</style></head>`,
    );
    const p = await open("/themed", themed);
    await p.locator("derivative-widget >> role=button").first().click();
    await p.locator("derivative-widget >> role=dialog").waitFor();
    const styles = await p.evaluate(() => {
      const root = document.querySelector("derivative-widget")?.shadowRoot;
      const style = (selector: string) => {
        const el = root?.querySelector(selector);
        return el ? getComputedStyle(el) : undefined;
      };
      return {
        radius: style(".trigger")?.borderTopLeftRadius,
        badge: style(".badge")?.backgroundColor,
        z: style(".panel")?.zIndex,
        outline: style(".dv-entry")?.outlineColor,
        spacing: style(".dv-title")?.letterSpacing,
      };
    });
    expect(styles).toEqual({
      radius: "4px",
      badge: "rgb(1, 2, 3)",
      z: "77",
      outline: "rgb(9, 8, 7)",
      spacing: "5px",
    });
    await p.context().close();
  });

  it("keeps the announcement toast inside the viewport on right-to-left pages", async () => {
    const p = await open("/rtl-toast", page("announce", "rtl"), {
      viewport: { width: 400, height: 700 },
    });
    const toast = p.locator("derivative-widget >> .toast");
    await toast.waitFor();
    await p.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
    const box = await toast.boundingBox();
    expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(400);
    await p.context().close();
  });
});
