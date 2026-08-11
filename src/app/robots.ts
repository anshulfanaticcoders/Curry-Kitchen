import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/server/seo";

export default function robots(): MetadataRoute.Robots {
  const origin = getSiteOrigin();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/admin/", "/dashboard", "/dashboard/", "/api", "/api/"],
    },
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
