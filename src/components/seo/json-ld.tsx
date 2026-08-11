import { serializeJsonLd } from "@/lib/seo-core.mjs";

export function JsonLd({ data }: { data: unknown | unknown[] }) {
  const entries = Array.isArray(data) ? data : [data];
  if (!entries.length) return null;

  return entries.map((entry, index) => (
    <script
      key={index}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(entry) }}
    />
  ));
}
