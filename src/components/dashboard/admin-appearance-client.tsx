"use client";

import { ImagePlus, Loader2, Pencil, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ImagePicker } from "@/components/dashboard/forms/image-picker";
import { Card, Field, PageHeader, Select } from "@/components/dashboard/primitives";
import { Button } from "@/components/ui/button";
import { resetPageBackgroundAction, savePageBackgroundAction } from "@/lib/actions/admin";
import {
  PAGE_BACKGROUND_FOCAL_OPTIONS,
  PAGE_BACKGROUND_OVERLAY_OPTIONS,
  type PageBackgroundFocalPoint,
  type PageBackgroundOverlay,
} from "@/lib/page-backgrounds";
import type { AdminPageBackground } from "@/lib/types";

const overlayPreview: Record<PageBackgroundOverlay, string> = {
  NONE: "bg-transparent",
  LIGHT: "bg-black/20",
  MEDIUM: "bg-black/42",
  DARK: "bg-black/64",
};

function formatUpdatedAt(value: string | null) {
  if (!value) return "Built-in default";

  return `Updated ${new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))}`;
}

export function AdminAppearanceClient({ backgrounds }: { backgrounds: AdminPageBackground[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<AdminPageBackground | null>(null);
  const [pending, startTransition] = useTransition();

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await savePageBackgroundAction(formData);

      if (!result.ok) {
        toast.error("Background not saved", { description: result.error });
        return;
      }

      toast.success(result.message ?? "Page background saved.");
      setEditing(null);
      router.refresh();
    });
  }

  function restoreDefault(slot: string) {
    startTransition(async () => {
      const result = await resetPageBackgroundAction(slot);

      if (!result.ok) {
        toast.error("Background not restored", { description: result.error });
        return;
      }

      toast.success(result.message ?? "Built-in background restored.");
      setEditing(null);
      router.refresh();
    });
  }

  return (
    <div>
      <PageHeader
        title="Appearance"
        description="Manage the visual backgrounds used across the public website. Choose an image from Media, upload a new one, or paste a secure URL."
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {backgrounds.map((background) => (
          <Card key={background.slot} className="group overflow-hidden">
            <div className="relative aspect-[16/9] overflow-hidden bg-ink">
              {/* eslint-disable-next-line @next/next/no-img-element -- backgrounds may be secure admin-provided URLs. */}
              <img
                src={background.imageUrl}
                alt={`${background.page} ${background.section} background preview`}
                className="size-full object-cover transition duration-700 group-hover:scale-[1.035]"
                style={{ objectPosition: `${background.focalPoint.toLowerCase()} center` }}
              />
              <div className={`absolute inset-0 ${overlayPreview[background.overlay]}`} />
              <span className="absolute left-4 top-4 rounded-full border border-white/18 bg-black/35 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.13em] text-white backdrop-blur-md">
                {background.isCustom ? "Custom" : "Default"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 p-5">
              <div className="min-w-0">
                <p className="font-display text-lg font-black">{background.page}</p>
                <p className="mt-1 text-sm font-medium text-ink/55">{background.section}</p>
                <p className="mt-2 text-xs font-bold text-ink/38">{formatUpdatedAt(background.updatedAt)}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(background)}
                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-button border border-ink/10 bg-white px-3.5 text-sm font-extrabold text-ink transition hover:border-saffron hover:text-masala"
              >
                <Pencil size={16} />
                Edit
              </button>
            </div>
          </Card>
        ))}
      </div>

      {editing ? (
        <div className="fixed inset-0 z-[75] flex items-end justify-center p-0 sm:items-center sm:p-5">
          <button
            type="button"
            aria-label="Close appearance editor"
            className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
            onClick={() => (pending ? undefined : setEditing(null))}
          />
          <form
            onSubmit={save}
            className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-white shadow-[0_34px_120px_rgba(7,7,7,0.34)] sm:rounded-2xl"
          >
            <input type="hidden" name="slot" value={editing.slot} />
            <div className="flex items-start justify-between gap-4 border-b border-ink/8 px-5 py-5 sm:px-7">
              <div>
                <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-masala">
                  <SlidersHorizontal size={15} />
                  Page background
                </p>
                <h2 className="mt-2 font-display text-2xl font-black">{editing.page}: {editing.section}</h2>
                <p className="mt-2 text-sm leading-6 text-ink/55">
                  The image remains safely editable here without changing packages, menus, or cards.
                </p>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => setEditing(null)}
                aria-label="Close"
                className="grid size-9 shrink-0 place-items-center rounded-button border border-ink/10 text-ink/60 transition hover:text-ink disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-6 px-5 py-6 sm:px-7">
              <Field label="Background image" hint="Use Media, upload a JPG/PNG/WEBP, or paste a secure HTTPS image URL.">
                <ImagePicker
                  key={editing.slot}
                  name="imageUrl"
                  defaultValue={editing.imageUrl}
                  folder="backgrounds"
                  required
                  uploadTitle="Upload background image"
                  uploadDescription="Drag a JPG, PNG, or WEBP here. Maximum 10MB. It will be saved in the backgrounds folder."
                  previewAlt={`${editing.page} ${editing.section} background`}
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Image focal point" hint="Keep the important part of the image visible behind the copy.">
                  <Select name="focalPoint" defaultValue={editing.focalPoint as PageBackgroundFocalPoint}>
                    {PAGE_BACKGROUND_FOCAL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Text overlay" hint="Choose the contrast level needed for this page’s text.">
                  <Select name="overlay" defaultValue={editing.overlay as PageBackgroundOverlay}>
                    {PAGE_BACKGROUND_OVERLAY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </Select>
                </Field>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-ink/8 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <button
                type="button"
                disabled={pending || !editing.isCustom}
                onClick={() => restoreDefault(editing.slot)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-button border border-ink/10 px-4 text-sm font-extrabold text-ink/65 transition hover:border-saffron hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
              >
                <RotateCcw size={17} />
                Restore built-in
              </button>
              <div className="flex gap-3">
                <Button type="button" variant="secondary" disabled={pending} onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? <Loader2 className="animate-spin" size={18} /> : <ImagePlus size={18} />}
                  {pending ? "Saving" : "Save background"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
