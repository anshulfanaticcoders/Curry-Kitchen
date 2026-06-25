---
description: Use at the start of any non-trivial Curry Kitchen task to decide which project skills and MCP tools should be used. Routes design, browser QA, docs lookup, research, planning, implementation, testing, WordPress migration, and future API/database work.
---

# Curry Kitchen Task Router

Before starting substantial work, choose the smallest useful set of skills and MCP tools.

## Skill Routing

- Creative/product/design change: use `brainstorming`, then `frontend-design-new-enhanced`, then `impeccable` or `curry-homepage-design`.
- Homepage/header/footer/marketing page: use `curry-homepage-design`, `frontend-design-new-enhanced`, and `impeccable`.
- Visual QA/browser inspection: use `agent-browser` and the `playwright` MCP server.
- Current library/API docs: use `research-and-docs`, then `ref` or `context7` MCP.
- Web/current inspiration or competitor research: use `research-and-docs`, then `exa` MCP.
- E2E flow or UI regression testing: use `e2e-testing-patterns` and `playwright`.
- Prompt/spec improvement: use `prompt-engineering-patterns`.
- Risky code changes/refactors: use `karpathy-guidelines` and run `npm run lint` plus `npm run build`.
- Error states or resilience: use `error-handling-patterns`.
- Future backend contracts: use `api-design-principles`.
- Future MySQL schema: use `mysql-table-design`.
- WordPress migration/source parity: use `wordpress-pro`.

## Project Guardrails

- Phase 1 is frontend-only. Do not add backend database logic unless explicitly requested.
- Desktop homepage design is the current priority unless the user says otherwise.
- Prefer full-width atmospheric sections with content constrained inside `.section-shell`.
- Verify meaningful changes with `npm run lint` and `npm run build`.
