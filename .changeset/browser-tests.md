---
"@sweberdev/derivative": minor
"@sweberdev/derivative-react": minor
"@sweberdev/derivative-vue": minor
---

Real-browser tests (Chromium via playwright-core) check layout, colour contrast, focus, search and reduced motion, and found two things that jsdom could not: type badges in light mode (breaking, security, fix) had a contrast of about 4.2:1 and are now darker (WCAG AA 4.5:1), and the panel and toast ignored right-to-left pages and opened off-screen. They now use logical properties. Four example projects (Vite, Next.js, SvelteKit, Astro) are built in CI.
