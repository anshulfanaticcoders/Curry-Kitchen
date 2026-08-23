import type { Metadata } from "next";
import { OurStoryExperience } from "@/components/sections/our-story-experience";
import { JsonLd } from "@/components/seo/json-ld";
import { getPageBackgrounds } from "@/lib/server/page-backgrounds";
import { getMarketingMetadata, getSimplePageSchemas } from "@/lib/server/seo";

export function generateMetadata(): Promise<Metadata> {
  return getMarketingMetadata("/about");
}

export default async function AboutPage() {
  const [schemas, backgrounds] = await Promise.all([getSimplePageSchemas("/about"), getPageBackgrounds()]);
  return <><JsonLd data={schemas} /><OurStoryExperience background={backgrounds["about.hero"]} /></>;
}
