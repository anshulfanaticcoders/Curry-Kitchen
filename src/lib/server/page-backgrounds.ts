import "server-only";

import { db } from "@/lib/db";
import {
  getDefaultPageBackground,
  isPageBackgroundSlot,
  PAGE_BACKGROUND_SLOTS,
  type PageBackgroundSlot,
  type PageBackgroundVisual,
} from "@/lib/page-backgrounds";

export type PageBackgroundMap = Record<PageBackgroundSlot, PageBackgroundVisual>;

function defaults(): PageBackgroundMap {
  return Object.fromEntries(
    PAGE_BACKGROUND_SLOTS.map((entry) => [entry.slot, getDefaultPageBackground(entry.slot)]),
  ) as PageBackgroundMap;
}

// Falls back to the built-in visual system if a migration has not reached an
// environment yet, so a content update can never blank a public page.
export async function getPageBackgrounds(): Promise<PageBackgroundMap> {
  const backgrounds = defaults();

  try {
    const stored = await db.pageBackground.findMany();

    for (const background of stored) {
      if (!isPageBackgroundSlot(background.slot)) continue;

      backgrounds[background.slot] = {
        imageUrl: background.imageUrl,
        focalPoint: background.focalPoint,
        overlay: background.overlay,
      };
    }
  } catch {
    // The defaults above are intentionally safe during a rolling deployment.
  }

  return backgrounds;
}

export async function getPageBackground(slot: PageBackgroundSlot): Promise<PageBackgroundVisual> {
  const backgrounds = await getPageBackgrounds();
  return backgrounds[slot];
}
