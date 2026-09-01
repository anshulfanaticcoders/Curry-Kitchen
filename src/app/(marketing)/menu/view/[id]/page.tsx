import { ArrowLeft, Download } from "lucide-react";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { getActiveMenuUploads } from "@/lib/server/catalog";

export const dynamic = "force-dynamic";

export default async function MenuViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const menu = (await getActiveMenuUploads()).find((item) => item.id === id);

  if (!menu) notFound();

  return (
    <main className="min-h-screen bg-ink px-4 pb-10 pt-28 text-white sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-saffron">Weekly menu</p>
            <h1 className="mt-2 font-display text-3xl font-black sm:text-4xl">{menu.title}</h1>
            <p className="mt-1 text-sm font-bold text-white/58">{menu.dateRangeLabel}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/menu" variant="secondary" className="border-white/20 bg-transparent text-white hover:bg-white hover:text-ink">
              <ArrowLeft size={18} />
              Back to menus
            </ButtonLink>
            <ButtonLink href={menu.fileUrl}>
              <Download size={18} />
              Download
            </ButtonLink>
          </div>
        </div>

        <section className="flex min-h-[58svh] items-center justify-center overflow-hidden rounded-lg border border-white/12 bg-black/35 p-3 sm:p-6">
          {menu.isPdf ? (
            <iframe
              src={menu.fileUrl}
              title={`${menu.title} PDF menu`}
              className="h-[72svh] w-full rounded-md bg-white"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- original menu artwork should retain its natural proportions.
            <img
              src={menu.fileUrl}
              alt={`${menu.title} Curry Kitchen weekly menu`}
              className="max-h-[72svh] max-w-full object-contain object-center"
            />
          )}
        </section>
      </div>
    </main>
  );
}
