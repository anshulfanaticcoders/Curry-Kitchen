"use client";

import { FolderOpen, Loader2, UploadCloud, X } from "lucide-react";
import { type ChangeEvent, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/dashboard/primitives";

const MAX_MEDIA_FILE_SIZE = 10 * 1024 * 1024;

type MediaAssetOption = { id: string; fileName: string; fileUrl: string; folder: string };

// Image field with three sources: direct upload, the shared media library, or
// a pasted URL. The chosen value is submitted through a hidden input. Uploads
// land in the given media folder so everything stays organized in /admin/media.
export function ImagePicker({
  name,
  defaultValue = "",
  required = false,
  folder = "general",
  onValueChange,
}: {
  name: string;
  defaultValue?: string;
  required?: boolean;
  folder?: string;
  onValueChange?: (url: string) => void;
}) {
  const [url, setUrlState] = useState(defaultValue);

  function setUrl(next: string) {
    setUrlState(next);
    onValueChange?.(next);
  }
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [assets, setAssets] = useState<MediaAssetOption[] | null>(null);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [folderFilter, setFolderFilter] = useState("all");

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    input.value = "";

    if (!file) return;

    if (file.size > MAX_MEDIA_FILE_SIZE) {
      toast.error("File too large", { description: "Upload an image smaller than 10MB." });
      return;
    }

    setUploading(true);

    try {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", folder);
      const response = await fetch("/api/uploads/media", { method: "POST", body });
      const payload = (await response.json()) as { ok?: boolean; url?: string; error?: string };

      if (!response.ok || !payload.ok || !payload.url) {
        throw new Error(payload.error ?? "Upload failed.");
      }

      setUrl(payload.url);
      setAssets(null);
      toast.success("Image uploaded");
    } catch (error) {
      toast.error("Upload failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setUploading(false);
    }
  }

  async function openPicker() {
    setPickerOpen(true);

    if (assets) return;

    setLoadingAssets(true);

    try {
      const response = await fetch("/api/uploads/media");
      const payload = (await response.json()) as { ok?: boolean; assets?: MediaAssetOption[] };
      setAssets(payload.ok ? payload.assets ?? [] : []);
    } catch {
      setAssets([]);
    } finally {
      setLoadingAssets(false);
    }
  }

  return (
    <div className="grid gap-3">
      <input type="hidden" name={name} value={url} required={required} />

      <div className="flex flex-wrap items-center gap-3">
        {url ? (
          <span className="relative size-20 shrink-0 overflow-hidden rounded-xl border border-ink/10 bg-frost">
            {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary admin-selected image */}
            <img src={url} alt="Selected image" className="size-full object-cover" />
          </span>
        ) : (
          <span className="grid size-20 shrink-0 place-items-center rounded-xl border border-dashed border-ink/15 bg-frost text-[11px] font-bold text-ink/40">
            No image
          </span>
        )}
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-button border border-ink/10 bg-white px-4 text-sm font-extrabold transition hover:border-saffron/50">
            {uploading ? <Loader2 className="animate-spin" size={16} /> : <UploadCloud size={16} />}
            {uploading ? "Uploading…" : "Upload image"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
          <button
            type="button"
            onClick={openPicker}
            className="inline-flex h-10 items-center gap-2 rounded-button border border-ink/10 bg-white px-4 text-sm font-extrabold transition hover:border-saffron/50"
          >
            <FolderOpen size={16} />
            Choose from media
          </button>
        </div>
      </div>

      <Input
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        placeholder="…or paste an image URL (https://…)"
        aria-label="Image URL"
      />

      {pickerOpen ? (
        <div className="fixed inset-0 z-[70] grid place-items-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-ink/55 backdrop-blur-sm"
            onClick={() => setPickerOpen(false)}
            aria-label="Close media picker"
          />
          <div className="relative flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-[0_30px_90px_rgba(7,7,7,0.3)]">
            <div className="flex items-center justify-between border-b border-ink/8 px-5 py-4">
              <p className="font-display text-lg font-black">Choose from media</p>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="grid size-9 place-items-center rounded-xl border border-ink/10 text-ink/60 hover:text-ink"
                aria-label="Close"
              >
                <X size={17} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {assets?.length ? (
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {["all", ...Array.from(new Set(assets.map((asset) => asset.folder))).sort()].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setFolderFilter(option)}
                      className={
                        folderFilter === option
                          ? "rounded-full bg-saffron px-3 py-1.5 text-xs font-extrabold text-white"
                          : "rounded-full border border-ink/10 bg-white px-3 py-1.5 text-xs font-extrabold text-ink/55 hover:text-ink"
                      }
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : null}
              {loadingAssets ? (
                <div className="grid place-items-center py-16 text-ink/45">
                  <Loader2 className="animate-spin" size={24} />
                </div>
              ) : assets?.length ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {(folderFilter === "all" ? assets : assets.filter((asset) => asset.folder === folderFilter)).map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => {
                        setUrl(asset.fileUrl);
                        setPickerOpen(false);
                      }}
                      className="group overflow-hidden rounded-xl border border-ink/8 bg-frost text-left transition hover:border-saffron"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- admin media thumbnails */}
                      <img src={asset.fileUrl} alt={asset.fileName} loading="lazy" className="aspect-square w-full object-cover" />
                      <span className="block truncate px-2.5 py-2 text-xs font-extrabold">{asset.fileName}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-ink/15 bg-frost p-10 text-center text-sm font-bold text-ink/55">
                  No images in the media library yet. Use “Upload image” here or the Media page.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
