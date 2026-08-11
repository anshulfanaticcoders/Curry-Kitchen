export const DEFAULT_MEDIA_FOLDERS = [
  "general",
  "homepage",
  "packages",
  "menu",
  "about",
  "seo",
];

// Single-level folder names only: lowercase slug, no nesting.
export function normalizeMediaFolder(value: unknown) {
  if (typeof value !== "string") return "general";
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[/\\]/g, " ")
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-+|-+$)/g, "")
    .slice(0, 40);
  return slug || "general";
}
