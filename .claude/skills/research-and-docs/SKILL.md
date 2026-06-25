---
description: Use when Curry Kitchen work needs current web research, competitor/reference inspiration, framework/library documentation, API docs, package usage, or source-backed technical facts. Routes Claude to Exa, Ref, Context7, and Playwright MCP as appropriate.
---

# Research And Docs

Use the right MCP for the information need.

## MCP Routing

- Use `ref` for precise technical documentation search and URL reading:
  - `ref_search_documentation` for docs discovery.
  - `ref_read_url` for reading a known docs URL.
- Use `context7` for library/framework documentation context, especially Next.js, React, Tailwind, Framer Motion, Embla, Recharts, and Lucide.
- Use `exa` for current web search, design inspiration, competitor research, food/restaurant references, and pages that are not primarily API docs.
- Use `playwright` when the information requires seeing or interacting with the running site in a browser.

## Source Discipline

- Prefer official documentation for implementation details.
- Prefer direct pages over summaries when evaluating a specific design/reference site.
- When using web inspiration, summarize the useful design mechanics instead of copying a site's content or brand.
- Keep fetched context compact: search first, then read only the most relevant pages.

## Known Project Needs

- For Vrooem-style inspiration, identify presence/motion/layout mechanics, not the color palette.
- For Curry Kitchen, translate inspiration into food-led premium design using black, white, and orange.
