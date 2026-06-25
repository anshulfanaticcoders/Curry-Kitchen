# Curry Kitchen Homepage Rebuild — Design

Date: 2026-06-23
Goal: Fix the "sections too long / not attractive / can't see in one glance" problem. Full layout
rebuild of sections, each band sized to roughly one viewport, with a unified spacing/type/motion
system and a tighter narrative sequence.

## Problems diagnosed (current `src/app/page.tsx`)

1. Every section uses `py-24` → each band is ~full-screen-plus tall. Stacked = endless scroll.
2. Heading inflation: `text-5xl`/`text-6xl` in every section + `min-h-[560–620px]` image panels.
3. Monotonous rhythm: ~6 of 8 sections are the same 2-col "big heading + image" layout.
4. Sequence buries product proof: Story sits before Weekly Menu / Packages.

## Decisions (confirmed with client)

- Scope: **full layout rebuild** of sections 2–8 + a shared spacing/type/motion system.
- Density: **each section ≈ one viewport** (true "see it in one glance").
- Sequence: **move Weekly Menu above Our Story** (lead with appetite).
- Hero: **drop the sample-tiffin card**, keep the floating stat bar + Build order CTA.

## 1. Design system

In `globals.css`:
- `.section` → `py-16 lg:py-20` (replaces ad-hoc `py-24`).
- `.section--screen` → `min-h-[88vh] flex items-center` for one-glance bands.
- Type scale cap: section headings `text-4xl lg:text-5xl` max (no more `text-6xl`); eyebrow
  `text-xs uppercase tracking`; lead `text-base lg:text-lg`.
- Image panel cap: `min-h-[420px] lg:max-h-[480px]`.

## 2. Sequence

1. Hero (full screen — trimmed)
2. Promise strip (compact band)
3. How it works (3-step horizontal rail)
4. Weekly menu (moved up)
5. Packages
6. Our Story (moved down)
7. Reviews (carousel)
8. Final CTA (slim banner)

## 3. Section compositions

- Hero: keep bg + parallax; remove sample-tiffin card; keep floating stat bar; tighter copy stack.
- Promise: 4 tall cards → compact inline icon row / marquee on one dark strip.
- How it works: 3-step horizontal rail with connecting progress line + one inline image.
- Weekly menu: 3 capped image cards, day/date overlay, hover zoom; `.section--screen`.
- Packages: existing `PackageCard` row, tightened header.
- Story: compact 2-col split, one image, 3 inline stats, shorter copy.
- Reviews: Embla carousel on compact dark band.
- Final CTA: slim full-width banner (not a tall boxed card).

## 4. Motion

- Standardize `AnimatedSection` + stagger-children container (eyebrow→head→body→cards reveal in
  sequence, not all at once).
- Restrained parallax on hero + menu images only.
- Hover lift on interactive cards.
- Respect existing reduced-motion block.

## 5. Verify

`npm run lint` → `npm run build` → Playwright MCP desktop screenshot per band to confirm one-glance
density.
