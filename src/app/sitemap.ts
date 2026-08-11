import type { MetadataRoute } from "next";
import { getSitemap } from "@/lib/server/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return getSitemap();
}
