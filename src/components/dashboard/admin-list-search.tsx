"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Loader2, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { adminListHref, type AdminListQuery } from "@/lib/admin-list-query";

const iconButton = "grid size-11 shrink-0 place-items-center rounded-lg border border-ink/15 text-ink transition hover:bg-frost focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saffron disabled:opacity-50";

export function AdminListSearch({ path, query, label, placeholder }: {
  path: string; query: AdminListQuery; label: string; placeholder: string;
}) {
  const router = useRouter();
  const id = useId();
  const [value, setValue] = useState(query.q);
  const [pending, startTransition] = useTransition();
  function search(q: string) {
    startTransition(() => router.push(adminListHref(path, { ...query, q: q.trim(), page: 1 }), { scroll: false }));
  }
  return (
    <form role="search" aria-label={label} aria-busy={pending} className="mb-5 max-w-2xl" onSubmit={(event) => { event.preventDefault(); search(value); }}>
      <label htmlFor={id} className="mb-2 block text-sm font-bold">{label}</label>
        <div className="flex min-w-0 items-center gap-2">
          <input id={id} type="search" name="q" value={value} maxLength={120} onChange={(event) => setValue(event.target.value)} placeholder={placeholder}
            className="h-11 min-w-0 flex-1 rounded-lg border border-ink/20 bg-white px-3 text-sm font-medium text-ink placeholder:text-ink/65 focus:border-saffron focus:outline-2 focus:outline-saffron" />
          <button type="submit" disabled={pending} aria-label={label} title={label} className={`${iconButton} border-saffron bg-saffron hover:bg-saffron/85`}>
            {pending ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Search size={18} aria-hidden="true" />}
          </button>
          {value || query.q ? <button type="button" disabled={pending} aria-label="Clear search" title="Clear search" className={iconButton}
            onClick={() => { setValue(""); search(""); }}><X size={18} aria-hidden="true" /></button> : null}
        </div>
      {pending ? <p role="status" className="mt-2 text-sm text-ink/70">Searching...</p> : null}
    </form>
  );
}

export function AdminListPagination({ path, query, hasNext, count }: { path: string; query: AdminListQuery; hasNext: boolean; count: number }) {
  return <nav aria-label="Results pagination" className="mt-4 flex flex-wrap items-center justify-between gap-3">
    <p role="status" className="text-sm font-medium text-ink/70">Page {query.page} / {count} {count === 1 ? "result" : "results"}</p>
    <div className="flex gap-2">
      {query.page > 1 ? <Link href={adminListHref(path, { ...query, page: query.page - 1 })} scroll={false} className={iconButton} title="Previous page" aria-label="Previous page"><ArrowLeft size={18} aria-hidden="true" /></Link>
        : <button disabled className={iconButton} aria-label="Previous page"><ArrowLeft size={18} aria-hidden="true" /></button>}
      {hasNext ? <Link href={adminListHref(path, { ...query, page: query.page + 1 })} scroll={false} className={iconButton} title="Next page" aria-label="Next page"><ArrowRight size={18} aria-hidden="true" /></Link>
        : <button disabled className={iconButton} aria-label="Next page"><ArrowRight size={18} aria-hidden="true" /></button>}
    </div>
  </nav>;
}
