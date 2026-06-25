---
description: Use for Curry Kitchen homepage or public marketing UI redesign work. Focuses Claude on premium desktop-first restaurant/tiffin design, visual hierarchy, motion, imagery, and client approval readiness.
argument-hint: "[page-or-section]"
allowed-tools: Read Edit MultiEdit Write Bash(npm run lint) Bash(npm run build)
---

# Curry Kitchen Homepage Design Skill

Use this skill before changing the homepage, header, footer, About/Our Story, testimonials, menu previews, package previews, or public marketing sections.

## Design Goal

Make the site feel like a premium food delivery/tiffin brand, not a generic restaurant template and not a WordPress/WooCommerce rebuild. Desktop design is the current approval target; responsive refinement comes later.

## Required Homepage Narrative

1. Hero: full-bleed food image, readable transparent/floating header, clear ordering CTA.
2. Trust/promise: why Curry Kitchen is reliable and homemade.
3. Order path: menu to package to delivery with clear steps.
4. Our Story/About: local kitchen, home-style food, weekday comfort.
5. Weekly menu preview: appetizing food imagery, not a plain product list.
6. Package preview: clear plans, premium cards, direct CTA.
7. Reviews/testimonials: Embla carousel, real social proof.
8. Final CTA: order rhythm and delivery area.

## Visual Rules

- Use full-width background bands; keep content inside `.section-shell`.
- Alternate section moods: black/ink, orange/saffron, white, off-white/rose, and image-backed dark bands.
- Add relevant food/kitchen imagery when it strengthens the section.
- Avoid all sections being white.
- Avoid decorative grid lines in the hero.
- Avoid generic icon-card grids unless the content truly needs comparison.
- Do not use in-page text explaining that this is a mock or prototype.
- Keep orange as the primary brand accent.
- Use Merienda for expressive headings and Lato for body, as already configured.

## Motion Rules

- Prefer purposeful reveal choreography: opacity, y, blur, scale, clip/mask where useful.
- Keep content visible enough before animation so screenshots do not look blank.
- Respect reduced motion through existing global CSS.
- Validate important changes in the browser when possible, especially hero/header and carousel areas.

## Implementation Checklist

- Read `PRODUCT.md`, `CLAUDE.md`, `src/app/page.tsx`, `src/components/layout/navbar.tsx`, `src/components/sections/hero-section.tsx`, and `src/app/globals.css`.
- Make focused edits using existing components where possible.
- Run `npm run lint`.
- Run `npm run build`.
- If Playwright MCP is available, inspect `http://localhost:3000/` at desktop width.
