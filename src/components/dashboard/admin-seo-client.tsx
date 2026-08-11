"use client";

import { CheckCircle2, Globe2, ImageIcon, Loader2, Pencil, Plus, RotateCcw, Search, Settings2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmActionButton } from "@/components/dashboard/confirm-action-button";
import { ImagePicker } from "@/components/dashboard/forms/image-picker";
import { Card, CardHeader, Field, Input, PageHeader, Table, Td, Textarea, Th } from "@/components/dashboard/primitives";
import { Button, ButtonLink } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { resetSeoRecordAction, saveSeoSettingsAction } from "@/lib/actions/admin";
import type { AdminSeoManagerData, AdminSeoRecord } from "@/lib/types";

type FieldErrors = Record<string, string[]>;

function Errors({ name, errors }: { name: string; errors: FieldErrors }) {
  const message = errors[name]?.[0];
  return message ? <span className="text-xs font-bold text-masala">{message}</span> : null;
}

function applyTitleSuffix(title: string, suffix: string) {
  return !suffix || title.endsWith(suffix) ? title : `${title}${suffix}`;
}

function editHref(record: AdminSeoRecord) {
  return record.targetType === "PACKAGE" && record.packageId
    ? `/admin/seo/edit?package=${encodeURIComponent(record.packageId)}`
    : `/admin/seo/edit?path=${encodeURIComponent(record.path)}`;
}

function SiteDefaultsForm({ data }: { data: AdminSeoManagerData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<FieldErrors>({});

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await saveSeoSettingsAction(formData);
      if (result.ok) { toast.success(result.message ?? "Site defaults saved."); router.refresh(); return; }
      setErrors(result.fieldErrors ?? {});
      toast.error("Site defaults could not be saved", { description: result.error });
    });
  }

  return (
    <form className="grid gap-5 p-5" onSubmit={submit}>
      <Field label="Production domain" hint="Set with NEXT_PUBLIC_APP_URL during deployment."><Input value={data.origin} readOnly className="cursor-not-allowed bg-ink/5 text-ink/55" /></Field>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Title suffix"><Input name="titleSuffix" defaultValue={data.settings.titleSuffix} maxLength={40} /><Errors name="titleSuffix" errors={errors} /></Field>
        <Field label="Cuisine"><Input name="cuisine" defaultValue={data.settings.cuisine} /><Errors name="cuisine" errors={errors} /></Field>
        <Field label="Default description" className="md:col-span-2"><Textarea name="defaultDescription" defaultValue={data.settings.defaultDescription} maxLength={160} required /><Errors name="defaultDescription" errors={errors} /></Field>
        <Field label="Default social image" className="md:col-span-2"><ImagePicker name="defaultSocialImage" defaultValue={data.settings.defaultSocialImage} folder="seo" /><Errors name="defaultSocialImage" errors={errors} /></Field>
        <Field label="Logo" className="md:col-span-2"><ImagePicker name="logoUrl" defaultValue={data.settings.logoUrl} folder="seo" /><Errors name="logoUrl" errors={errors} /></Field>
        <Field label="Price range"><Input name="priceRange" defaultValue={data.settings.priceRange} placeholder="$$" /><Errors name="priceRange" errors={errors} /></Field>
        <Field label="Search Console verification token"><Input name="googleVerification" defaultValue={data.settings.googleVerification} /><Errors name="googleVerification" errors={errors} /></Field>
        <Field label="Social profile URLs" hint="One HTTPS URL per line" className="md:col-span-2"><Textarea name="socialProfiles" defaultValue={data.settings.socialProfiles.join("\n")} /><Errors name="socialProfiles" errors={errors} /></Field>
      </div>
      <div className="flex justify-end"><Button type="submit" disabled={pending}>{pending ? <Loader2 className="animate-spin" size={16} /> : <Settings2 size={16} />}{pending ? "Saving…" : "Save site defaults"}</Button></div>
    </form>
  );
}

export function AdminSeoClient({ data }: { data: AdminSeoManagerData }) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => data.records.filter((record) => `${record.page} ${record.path}`.toLowerCase().includes(query.toLowerCase())), [data.records, query]);
  const configured = data.records.filter((record) => record.configured).length;
  const indexed = data.records.filter((record) => record.indexed).length;
  const social = data.records.filter((record) => record.ogImageUrl || data.settings.defaultSocialImage).length;
  const schemas = data.records.filter((record) => record.schemaEnabled).length;
  const readiness = [
    { label: "Domain", value: data.origin.startsWith("https://") ? "Ready" : "Review", icon: Globe2 },
    { label: "Metadata", value: `${configured}/${data.records.length}`, icon: Search },
    { label: "Social images", value: `${social}/${data.records.length}`, icon: ImageIcon },
    { label: "Schemas", value: `${schemas}/${data.records.length}`, icon: ShieldCheck },
    { label: "Sitemap", value: `${data.records.filter((record) => record.indexed && record.includeInSitemap).length} URLs`, icon: CheckCircle2 },
    { label: "Verification", value: data.settings.googleVerification ? "Ready" : "Pending", icon: Globe2 },
  ];

  return (
    <div>
      <PageHeader
        title="SEO"
        description="Manage search appearance, social sharing, indexing, structured data, and sitemap inclusion."
        action={
          <ButtonLink href="/admin/seo/new">
            <Plus size={18} />
            Add page
          </ButtonLink>
        }
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {readiness.map((item) => <Card key={item.label} className="p-4"><item.icon size={17} className="text-saffron" /><p className="mt-4 text-[10px] font-black uppercase tracking-[0.16em] text-ink/42">{item.label}</p><p className="mt-1 font-display text-xl font-black">{item.value}</p></Card>)}
      </div>

      <Card className="mb-6"><CardHeader title="Site defaults" description="Fallbacks used wherever a page-specific field is blank." /><SiteDefaultsForm data={data} /></Card>

      <Card>
        <CardHeader title="Search pages" description={`${indexed} of ${data.records.length} registered pages can be indexed.`} action={<div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" size={16} /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pages…" className="w-64 pl-9" /></div>} />
        <Table><thead><tr><Th>Page</Th><Th>Search title</Th><Th>Status</Th><Th>Sitemap</Th><Th className="text-right">Actions</Th></tr></thead><tbody>{visible.map((record) => (
          <tr key={`${record.targetType}-${record.packageId ?? record.path}`} className="transition hover:bg-ivory/70">
            <Td><p className="font-extrabold">{record.page}</p><p className="mt-0.5 text-xs font-bold text-ink/42">{record.path}</p></Td>
            <Td className="max-w-sm"><p className="truncate text-ink/68">{applyTitleSuffix(record.title || record.defaultTitle, data.settings.titleSuffix)}</p><p className="mt-1 text-xs text-ink/40">{record.targetType === "PACKAGE" ? "Package" : "Static page"}</p></Td>
            <Td><div className="flex flex-wrap gap-1.5">{!record.indexed ? <StatusPill>No-index</StatusPill> : record.configured ? <StatusPill tone="green">Configured</StatusPill> : <StatusPill tone="amber">Using defaults</StatusPill>}</div></Td>
            <Td>{record.indexed && record.includeInSitemap ? <StatusPill tone="green">Included</StatusPill> : <StatusPill tone="ink">Excluded from sitemap</StatusPill>}</Td>
            <Td><div className="flex justify-end gap-2"><Link href={editHref(record)} aria-label={`Edit SEO for ${record.page}`} className="grid size-9 place-items-center rounded-button border border-ink/10 text-ink/60 transition hover:border-saffron/50 hover:text-ink"><Pencil size={16} /></Link>{record.id ? <ConfirmActionButton label={`Reset SEO for ${record.page}`} title={`Reset ${record.page}?`} description="Remove the manual override and return this page to automatic metadata, indexing, schema, and sitemap defaults." confirmLabel="Reset to automatic defaults" icon={<RotateCcw size={16} />} action={() => resetSeoRecordAction(record.id!)} /> : null}</div></Td>
          </tr>
        ))}</tbody></Table>
        {!visible.length ? <div className="p-10 text-center text-sm font-bold text-ink/50">No registered pages match that search.</div> : null}
      </Card>
    </div>
  );
}
