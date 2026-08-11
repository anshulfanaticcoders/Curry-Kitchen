"use client";

import { ImageIcon, Loader2 } from "lucide-react";
import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Toggle } from "@/components/dashboard/interactive";
import { ImagePicker } from "@/components/dashboard/forms/image-picker";
import { Field, Input, Textarea } from "@/components/dashboard/primitives";
import { Button, ButtonLink } from "@/components/ui/button";
import { saveSeoRecordAction } from "@/lib/actions/admin";
import type { AdminSeoRecord } from "@/lib/types";

type FieldErrors = Record<string, string[]>;

function Errors({ name, errors }: { name: string; errors: FieldErrors }) {
  const message = errors[name]?.[0];
  return message ? <span className="text-xs font-bold text-masala">{message}</span> : null;
}

function CharacterHint({ value, recommended, maximum }: { value: string; recommended: string; maximum: number }) {
  return (
    <span className={value.length > maximum ? "text-masala" : "text-ink/45"}>
      {value.length}/{maximum} · {recommended}
    </span>
  );
}

function applyTitleSuffix(title: string, suffix: string) {
  return !suffix || title.endsWith(suffix) ? title : `${title}${suffix}`;
}

function SearchPreview({ origin, path, title, description }: { origin: string; path: string; title: string; description: string }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-ink/42">Search preview</p>
      <p className="mt-4 truncate text-xs text-leaf">{origin}{path === "/" ? "" : path}</p>
      <p className="mt-1 line-clamp-1 text-xl font-semibold text-[#1a0dab]">{title}</p>
      <p className="mt-1 line-clamp-2 text-sm leading-6 text-ink/64">{description}</p>
    </div>
  );
}

function SocialPreview({ origin, image, title, description }: { origin: string; image: string; title: string; description: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-ink/10 bg-white">
      <p className="border-b border-ink/8 px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-ink/42">Social preview</p>
      <div
        className="grid aspect-[1.91/1] place-items-center bg-ink/5 bg-cover bg-center"
        style={image ? { backgroundImage: `url(${JSON.stringify(image)})` } : undefined}
      >
        {!image ? (
          <div className="grid justify-items-center gap-2 text-ink/35">
            <ImageIcon size={28} />
            <span className="text-xs font-bold">Default social image not set</span>
          </div>
        ) : null}
      </div>
      <div className="border-t border-ink/8 p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-ink/38">{origin.replace(/^https?:\/\//, "")}</p>
        <p className="mt-1 line-clamp-1 font-display text-lg font-black">{title}</p>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink/55">{description}</p>
      </div>
    </div>
  );
}

// One form for both flows: editing a registered/package page (fixed path) and
// creating a brand-new custom page entry (editable name + path).
export function SeoForm({
  record,
  origin,
  titleSuffix,
  defaultSocialImage,
  customPage = false,
}: {
  record?: AdminSeoRecord;
  origin: string;
  titleSuffix: string;
  defaultSocialImage: string;
  customPage?: boolean;
}) {
  const backHref = "/admin/seo";
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [indexed, setIndexed] = useState(record?.indexed ?? true);
  const [inSitemap, setInSitemap] = useState((record?.includeInSitemap ?? true) && (record?.indexed ?? true));
  const [schemaEnabled, setSchemaEnabled] = useState(record?.schemaEnabled ?? true);
  const [page, setPage] = useState(record?.page ?? "");
  const [path, setPath] = useState(record?.path ?? "/");
  const [title, setTitle] = useState(record?.title ?? "");
  const [description, setDescription] = useState(record?.description ?? "");
  const [ogTitle, setOgTitle] = useState(record?.ogTitle ?? "");
  const [ogDescription, setOgDescription] = useState(record?.ogDescription ?? "");
  const [ogImage, setOgImage] = useState(record?.ogImageUrl ?? "");
  const effectiveTitle = title || record?.defaultTitle || page || "Page title";
  const effectiveSearchTitle = applyTitleSuffix(effectiveTitle, titleSuffix);
  const effectiveDescription = description || record?.defaultDescription || "Page description preview.";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("indexed", String(indexed));
    formData.set("includeInSitemap", String(indexed && inSitemap));
    formData.set("schemaEnabled", String(schemaEnabled));
    startTransition(async () => {
      const result = await saveSeoRecordAction(formData);
      if (result.ok) {
        toast.success(result.message ?? "SEO settings saved.");
        router.push(backHref);
        router.refresh();
        return;
      }
      setErrors(result.fieldErrors ?? {});
      toast.error("SEO settings could not be saved", { description: result.error });
    });
  }

  return (
    <form className="grid gap-6" onSubmit={submit}>
      {record?.id ? <input type="hidden" name="id" value={record.id} /> : null}
      <input type="hidden" name="targetType" value={record?.targetType ?? "STATIC_PAGE"} />
      {record?.packageId ? <input type="hidden" name="packageId" value={record.packageId} /> : null}

      {customPage ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Page name">
            <Input name="page" value={page} onChange={(event) => setPage(event.target.value)} placeholder="Catering" required />
            <Errors name="page" errors={errors} />
          </Field>
          <Field label="Site path" hint="Starts with /, e.g. /catering">
            <Input name="path" value={path} onChange={(event) => setPath(event.target.value)} placeholder="/catering" required />
            <Errors name="path" errors={errors} />
          </Field>
        </div>
      ) : (
        <>
          <input type="hidden" name="page" value={record?.page ?? ""} />
          <input type="hidden" name="path" value={record?.path ?? "/"} />
          <div className="rounded-lg border border-saffron/20 bg-saffron/8 p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-masala">Canonical URL</p>
            <p className="mt-2 break-all text-sm font-bold">{origin}{path === "/" ? "" : path}</p>
            <p className="mt-1 text-xs text-ink/50">Generated automatically from the registered route.</p>
          </div>
        </>
      )}

      <SearchPreview origin={origin} path={path} title={effectiveSearchTitle} description={effectiveDescription} />

      <div className="grid gap-5">
        <Field label="Meta title" hint={<CharacterHint value={title} recommended="Aim for 50–60 characters" maximum={60} />}>
          <Input name="title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder={record?.defaultTitle} maxLength={60} />
          <Errors name="title" errors={errors} />
        </Field>
        <Field label="Meta description" hint={<CharacterHint value={description} recommended="Aim for 140–160 characters" maximum={160} />}>
          <Textarea name="description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder={record?.defaultDescription} maxLength={160} />
          <Errors name="description" errors={errors} />
        </Field>
      </div>

      <div className="border-t border-ink/10 pt-6">
        <p className="font-display text-xl font-black">Social sharing</p>
        <p className="mt-1 text-sm text-ink/52">Blank fields inherit the page metadata and site image.</p>
      </div>
      <SocialPreview origin={origin} image={ogImage || defaultSocialImage} title={ogTitle || effectiveSearchTitle} description={ogDescription || effectiveDescription} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Social title">
          <Input name="ogTitle" value={ogTitle} onChange={(event) => setOgTitle(event.target.value)} maxLength={90} />
          <Errors name="ogTitle" errors={errors} />
        </Field>
        <Field label="Image alt text">
          <Input name="ogImageAlt" defaultValue={record?.ogImageAlt} maxLength={160} />
          <Errors name="ogImageAlt" errors={errors} />
        </Field>
        <Field label="Social description" className="sm:col-span-2">
          <Textarea name="ogDescription" value={ogDescription} onChange={(event) => setOgDescription(event.target.value)} maxLength={200} />
          <Errors name="ogDescription" errors={errors} />
        </Field>
        <Field label="Social image" hint="Upload, pick from media, or paste a URL." className="sm:col-span-2">
          <ImagePicker name="ogImageUrl" defaultValue={ogImage} folder="seo" onValueChange={setOgImage} />
          <Errors name="ogImageUrl" errors={errors} />
        </Field>
      </div>

      <div className="grid gap-3 border-t border-ink/10 pt-6">
        <Toggle
          key={`index-${indexed}`}
          label="Allow search indexing"
          description="Publish this page in search results."
          defaultChecked={indexed}
          onCheckedChange={(checked) => {
            setIndexed(checked);
            if (!checked) setInSitemap(false);
          }}
        />
        <Toggle
          key={`sitemap-${indexed}-${inSitemap}`}
          label="Include in sitemap"
          description={indexed ? "Help crawlers discover this canonical URL." : "No-index pages are automatically excluded."}
          defaultChecked={indexed && inSitemap}
          onCheckedChange={(checked) => setInSitemap(indexed && checked)}
        />
        <Toggle
          key={`schema-${schemaEnabled}`}
          label="Enable structured data"
          description="Output only schema supported by visible page content."
          defaultChecked={schemaEnabled}
          onCheckedChange={setSchemaEnabled}
        />
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-ink/8 pt-5">
        <ButtonLink href={backHref} variant="secondary">
          Cancel
        </ButtonLink>
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="animate-spin" size={16} /> : null}
          {isPending ? "Saving…" : "Save SEO settings"}
        </Button>
      </div>
    </form>
  );
}
