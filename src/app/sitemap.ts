import type { MetadataRoute } from "next";
import { getSitemap } from "@/lib/server/seo";

// Rendered per request: the Docker build has no DATABASE_URL, so a build-time
// snapshot would freeze the sitemap without package URLs or lastmod.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return getSitemap();
}
