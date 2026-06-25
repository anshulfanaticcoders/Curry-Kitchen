# Curry Kitchen Claude Setup

## Project

This is a Phase 1 high-fidelity static mock for Curry Kitchen, a homemade Indian tiffin delivery service. The goal is client design approval before backend work begins. The future production stack is Next.js with MySQL, but this repo should stay frontend-only for now.

## Stack

- Next.js 16 App Router
- React 19
- Tailwind CSS 4 CSS-first theme tokens in `src/app/globals.css`
- Framer Motion for page/section motion
- Embla Carousel for testimonials
- Lucide React for icons
- Unsplash images for temporary food and kitchen imagery

## Design Direction

- Brand feel: handcrafted, confident, warm, premium, food-led.
- Visual system: black, white, and Curry Kitchen orange as the main identity. Avoid beige-heavy generic landing-page styling.
- Homepage priority: desktop design first. Responsive polish comes after desktop approval.
- Use full-width atmospheric sections with content constrained inside `.section-shell`.
- Use relevant food/kitchen background images where they improve the story.
- Avoid repeated plain white sections, generic card grids, decorative grid lines, and prototype-facing copy.
- Header should feel premium and usable over imagery, not like a basic WordPress menu.
- The homepage needs: hero, ordering path, weekly menu, packages, reviews/testimonials, and Our Story/About.

## Commands

- Start dev server: `npm run dev`
- Lint: `npm run lint`
- Production build: `npm run build`

## Working Rules

- Load project skills based on the task:
  - Planning/requirements: `project-task-router`, `brainstorming`.
  - Homepage/public UI: `curry-homepage-design`, `frontend-design-new-enhanced`, `impeccable`.
  - Current docs/research: `research-and-docs` with `ref`, `context7`, or `exa` MCP.
  - Browser/visual QA: `agent-browser` with `playwright` MCP.
  - E2E testing: `e2e-testing-patterns`.
  - Prompt/spec improvement: `prompt-engineering-patterns`.
  - Code quality/refactors: `karpathy-guidelines`.
  - Error/resilience: `error-handling-patterns`.
  - Future APIs/database: `api-design-principles`, `mysql-table-design`.
  - WordPress migration/reference work: `wordpress-pro`.
- Before code changes, inspect existing files and follow the current component/style conventions.
- For UI/design work, use `/impeccable` or the project `curry-homepage-design` skill.
- For visual validation, use the Playwright MCP server when available.
- For external design/site research, use Exa MCP when available.
- For current library docs, use Ref or Context7 MCP when available.
- Do not add backend database logic in Phase 1.
- Do not remove user changes unless explicitly asked.
- Keep edits focused and verify with `npm run lint` and `npm run build` after meaningful changes.
- If Next.js behavior is unclear, check `node_modules/next/dist/docs/` because this project uses a newer Next version.

@AGENTS.md
