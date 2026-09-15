export const PAGE_BACKGROUND_SLOTS = [
  {
    slot: "home.hero",
    page: "Homepage",
    section: "Hero",
    fallbackImageUrl:
      "/images/hero-approved-thali-v2.webp",
    focalPoint: "CENTER",
    overlay: "NONE",
  },
  {
    slot: "home.comfort",
    page: "Homepage",
    section: "Fresh meals feature",
    fallbackImageUrl:
      "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=1400&q=82",
    focalPoint: "CENTER",
    overlay: "MEDIUM",
  },
  {
    slot: "home.tiffin-details",
    page: "Homepage",
    section: "Tiffin details",
    fallbackImageUrl:
      "https://images.unsplash.com/photo-1567337710282-00832b415979?auto=format&fit=crop&w=1600&q=86",
    focalPoint: "CENTER",
    overlay: "DARK",
  },
  {
    slot: "home.final-cta",
    page: "Homepage",
    section: "Final call to action",
    fallbackImageUrl:
      "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1800&q=84",
    focalPoint: "CENTER",
    overlay: "DARK",
  },
  {
    slot: "packages.hero",
    page: "Packages",
    section: "Hero",
    fallbackImageUrl:
      "https://images.unsplash.com/photo-1630409346824-4f0e7b080087?auto=format&fit=crop&w=1400&q=80",
    focalPoint: "CENTER",
    overlay: "DARK",
  },
  {
    slot: "packages.build.hero",
    page: "Build your package",
    section: "Hero",
    fallbackImageUrl:
      "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=1400&q=80",
    focalPoint: "CENTER",
    overlay: "DARK",
  },
  {
    slot: "menu.hero",
    page: "Menu",
    section: "Hero",
    fallbackImageUrl:
      "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=1400&q=80",
    focalPoint: "CENTER",
    overlay: "DARK",
  },
  {
    slot: "about.hero",
    page: "Our story",
    section: "Hero",
    fallbackImageUrl:
      "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1900&q=82",
    focalPoint: "CENTER",
    overlay: "DARK",
  },
  {
    slot: "faq.hero",
    page: "FAQ",
    section: "Hero",
    fallbackImageUrl:
      "https://images.unsplash.com/photo-1543353071-10c8ba85a904?auto=format&fit=crop&w=1400&q=80",
    focalPoint: "CENTER",
    overlay: "DARK",
  },
  {
    slot: "contact.hero",
    page: "Contact",
    section: "Hero",
    fallbackImageUrl:
      "https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&w=1400&q=80",
    focalPoint: "CENTER",
    overlay: "DARK",
  },
  {
    slot: "blog.hero",
    page: "Blog",
    section: "Hero",
    fallbackImageUrl:
      "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1400&q=80",
    focalPoint: "CENTER",
    overlay: "DARK",
  },
  {
    slot: "checkout.hero",
    page: "Checkout",
    section: "Hero",
    fallbackImageUrl:
      "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=1400&q=80",
    focalPoint: "CENTER",
    overlay: "DARK",
  },
] as const;

export type PageBackgroundSlot = (typeof PAGE_BACKGROUND_SLOTS)[number]["slot"];
export type PageBackgroundFocalPoint = "LEFT" | "CENTER" | "RIGHT";
export type PageBackgroundOverlay = "NONE" | "LIGHT" | "MEDIUM" | "DARK";

export type PageBackgroundVisual = {
  imageUrl: string;
  focalPoint: PageBackgroundFocalPoint;
  overlay: PageBackgroundOverlay;
};

export const PAGE_BACKGROUND_FOCAL_OPTIONS: Array<{
  value: PageBackgroundFocalPoint;
  label: string;
}> = [
  { value: "LEFT", label: "Left" },
  { value: "CENTER", label: "Center" },
  { value: "RIGHT", label: "Right" },
];

export const PAGE_BACKGROUND_OVERLAY_OPTIONS: Array<{
  value: PageBackgroundOverlay;
  label: string;
}> = [
  { value: "NONE", label: "None" },
  { value: "LIGHT", label: "Light" },
  { value: "MEDIUM", label: "Medium" },
  { value: "DARK", label: "Dark" },
];

export function isPageBackgroundSlot(value: string): value is PageBackgroundSlot {
  return PAGE_BACKGROUND_SLOTS.some((entry) => entry.slot === value);
}

export function getDefaultPageBackground(slot: PageBackgroundSlot): PageBackgroundVisual {
  const entry = PAGE_BACKGROUND_SLOTS.find((candidate) => candidate.slot === slot);

  if (!entry) {
    throw new Error(`Unknown page background slot: ${slot}`);
  }

  return {
    imageUrl: entry.fallbackImageUrl,
    focalPoint: entry.focalPoint,
    overlay: entry.overlay,
  };
}
