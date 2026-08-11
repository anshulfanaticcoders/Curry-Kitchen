"use client";

import { Loader2, UploadCloud } from "lucide-react";
import { type ChangeEvent, useState } from "react";
import { toast } from "sonner";
import { FormActions, useAdminFormSubmit } from "@/components/dashboard/form-utils";
import { Field, Input } from "@/components/dashboard/primitives";
import { saveMenuUploadAction } from "@/lib/actions/admin";
import type { AdminMenuUpload } from "@/lib/types";

const MAX_MENU_FILE_SIZE = 10 * 1024 * 1024;

export function MenuUploadForm({ upload }: { upload?: AdminMenuUpload }) {
  const backHref = "/admin/menu";
  const { submit, pending } = useAdminFormSubmit(backHref);
  const [fileUrl, setFileUrl] = useState(upload?.fileUrl ?? "");
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    input.value = "";

    if (!file) return;

    if (file.size > MAX_MENU_FILE_SIZE) {
      toast.error("File too large", { description: "Upload a menu smaller than 10MB." });
      return;
    }

    setUploading(true);

    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/uploads/menus", { method: "POST", body });
      const payload = (await response.json()) as { ok?: boolean; url?: string; error?: string };

      if (!response.ok || !payload.ok || !payload.url) {
        throw new Error(payload.error ?? "Upload failed.");
      }

      setFileUrl(payload.url);
      setFileName(file.name);
      toast.success("Menu file uploaded");
    } catch (error) {
      toast.error("Upload failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <form className="grid gap-5" onSubmit={(event) => submit(event, saveMenuUploadAction)}>
      {upload ? <input type="hidden" name="id" value={upload.id} /> : null}
      <input type="hidden" name="fileUrl" value={fileUrl} />
      <Field label="Menu title">
        <Input name="title" defaultValue={upload?.title} placeholder="Week 1 menu" required />
      </Field>
      <Field label="Menu file (image or PDF)">
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-ink/20 bg-ivory px-4 py-3 text-sm font-extrabold transition hover:border-saffron/60">
          {uploading ? <Loader2 className="animate-spin" size={18} /> : <UploadCloud size={18} />}
          <span className="min-w-0 truncate">
            {uploading
              ? "Uploading…"
              : fileName || (fileUrl ? "Current file kept — choose a new file to replace" : "Choose a JPG, PNG, WEBP, or PDF")}
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
        <p className="mt-1 text-xs font-bold text-ink/45">Max 10MB. Export straight from Canva.</p>
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Visible from">
          <Input name="startDate" type="date" defaultValue={upload?.startDate} required />
        </Field>
        <Field label="Visible until (inclusive)">
          <Input name="endDate" type="date" defaultValue={upload?.endDate} required />
        </Field>
      </div>
      <p className="text-xs font-bold text-ink/45">
        The menu shows on the website between these dates and disappears automatically after the end date.
      </p>
      <FormActions
        pending={pending || uploading}
        backHref={backHref}
        submitLabel={upload ? "Save menu" : "Schedule menu"}
      />
    </form>
  );
}
