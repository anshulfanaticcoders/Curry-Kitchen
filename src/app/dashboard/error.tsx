"use client";

import { Button } from "@/components/ui/button";

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="rounded-card border border-red-200 bg-red-50 p-6"><h2 className="font-display text-2xl font-black">Your dashboard could not load</h2><p className="mt-2 max-w-xl text-sm text-ink/65">Please try again. If this continues, contact Curry Kitchen support.</p><Button className="mt-5" onClick={reset}>Try again</Button></div>;
}
