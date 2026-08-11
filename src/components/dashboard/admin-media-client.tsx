"use client";

import { FolderPlus, Loader2, Trash2, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ChangeEvent, useState } from "react";
import { toast } from "sonner";
import { ConfirmActionButton } from "@/components/dashboard/confirm-action-button";
import { Card, CardHeader, PageHeader, Select } from "@/components/dashboard/primitives";
import {
  createMediaFolderAction,
  deleteMediaAssetAction,
  deleteMediaFolderAction,
  moveMediaAssetAction,
} from "@/lib/actions/admin";
import type { AdminMediaAsset } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAX_MEDIA_FILE_SIZE = 10 * 1024 * 1024;

export function AdminMediaClient({
  assets,
  folders,
}: {
  assets: AdminMediaAsset[];
  folders: string[];
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [activeFolder, setActiveFolder] = useState<string>("all");
  const [newFolder, setNewFolder] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  const uploadFolder = activeFolder === "all" ? "general" : activeFolder;
  const visible = activeFolder === "all" ? assets : assets.filter((asset) => asset.folder === activeFolder);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const files = Array.from(input.files ?? []);
    input.value = "";

    if (!files.length) return;

    setUploading(true);

    try {
      for (const file of files) {
        if (file.size > MAX_MEDIA_FILE_SIZE) {
          toast.error(`${file.name} is too large`, { description: "Upload images smaller than 10MB." });
          continue;
        }

        const body = new FormData();
        body.append("file", file);
        body.append("folder", uploadFolder);
        const response = await fetch("/api/uploads/media", { method: "POST", body });
        const payload = (await response.json()) as { ok?: boolean; error?: string };

        if (!response.ok || !payload.ok) {
          toast.error(`${file.name} failed`, { description: payload.error ?? "Please try again." });
          continue;
        }
      }

      toast.success(`Uploaded to ${uploadFolder}`);
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  async function addFolder() {
    if (!newFolder.trim() || creatingFolder) return;

    setCreatingFolder(true);

    try {
      const result = await createMediaFolderAction(newFolder);

      if (result.ok) {
        toast.success(result.message ?? "Folder created.");
        setNewFolder("");
        router.refresh();
      } else {
        toast.error("Folder not created", { description: result.error });
      }
    } finally {
      setCreatingFolder(false);
    }
  }

  async function moveAsset(assetId: string, folder: string) {
    const result = await moveMediaAssetAction(assetId, folder);
    if (result.ok) {
      toast.success(result.message ?? "Moved.");
      router.refresh();
    } else {
      toast.error("Move failed", { description: result.error });
    }
  }

  return (
    <div>
      <PageHeader
        title="Media"
        description="Upload images once, organize them into folders, and reuse them anywhere an image is needed."
        action={
          <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-button bg-saffron px-5 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(255,122,26,0.35)] transition hover:bg-masala">
            {uploading ? <Loader2 className="animate-spin" size={18} /> : <UploadCloud size={18} />}
            {uploading ? "Uploading…" : `Upload to ${uploadFolder}`}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {["all", ...folders].map((folder) => (
          <button
            key={folder}
            type="button"
            onClick={() => setActiveFolder(folder)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-extrabold transition",
              activeFolder === folder
                ? "border-saffron bg-saffron text-white shadow-[0_8px_20px_rgba(255,122,26,0.3)]"
                : "border-ink/10 bg-white text-ink/60 hover:border-saffron/40 hover:text-ink",
            )}
          >
            {folder === "all" ? `All (${assets.length})` : `${folder} (${assets.filter((a) => a.folder === folder).length})`}
          </button>
        ))}
        <div className="flex items-center gap-2">
          <input
            value={newFolder}
            onChange={(event) => setNewFolder(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void addFolder();
              }
            }}
            placeholder="New folder…"
            className="h-9 w-36 rounded-full border border-dashed border-ink/20 bg-white px-4 text-sm font-bold outline-none transition placeholder:text-ink/35 focus:border-saffron"
          />
          <button
            type="button"
            onClick={() => void addFolder()}
            disabled={creatingFolder}
            aria-label="Add folder"
            className="grid size-9 place-items-center rounded-full border border-ink/10 bg-white text-ink/60 transition hover:border-saffron/50 hover:text-ink disabled:opacity-50"
          >
            {creatingFolder ? <Loader2 className="animate-spin" size={16} /> : <FolderPlus size={16} />}
          </button>
        </div>
      </div>

      <Card>
        <CardHeader
          title={activeFolder === "all" ? "All images" : activeFolder}
          description={visible.length ? `${visible.length} images` : "No images in this folder yet."}
          action={
            activeFolder !== "all" && activeFolder !== "general" ? (
              <ConfirmActionButton
                label={`Delete folder ${activeFolder}`}
                title={`Delete folder “${activeFolder}”?`}
                description="The folder is removed. Images inside it are kept and moved to the general folder."
                confirmLabel="Delete folder"
                icon={<Trash2 size={16} />}
                action={async () => {
                  const result = await deleteMediaFolderAction(activeFolder);
                  if (result.ok) setActiveFolder("all");
                  return result;
                }}
              />
            ) : undefined
          }
        />
        {visible.length ? (
          <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {visible.map((asset) => (
              <figure key={asset.id} className="group overflow-hidden rounded-xl border border-ink/8 bg-frost">
                <a href={asset.fileUrl} target="_blank" rel="noreferrer" className="block">
                  {/* eslint-disable-next-line @next/next/no-img-element -- admin-uploaded file of unknown dimensions served from our own API route */}
                  <img src={asset.fileUrl} alt={asset.fileName} loading="lazy" className="aspect-square w-full object-cover" />
                </a>
                <figcaption className="grid gap-2 px-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-extrabold">{asset.fileName}</span>
                    <span className="block text-[11px] font-bold text-ink/40">{asset.sizeLabel} · {asset.uploadedAt}</span>
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <Select
                      value={asset.folder}
                      onChange={(event) => moveAsset(asset.id, event.target.value)}
                      aria-label={`Folder for ${asset.fileName}`}
                      className="h-8 flex-1 rounded-lg px-2 text-xs font-bold"
                    >
                      {folders.map((folder) => (
                        <option key={folder} value={folder}>{folder}</option>
                      ))}
                    </Select>
                    <ConfirmActionButton
                      label={`Delete ${asset.fileName}`}
                      title={`Delete ${asset.fileName}?`}
                      description="Pages already using this image keep working until you change them, but the file is removed."
                      confirmLabel="Delete"
                      action={() => deleteMediaAssetAction(asset.id)}
                    />
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <div className="m-6 rounded-lg border border-dashed border-ink/15 bg-frost p-10 text-center text-sm font-bold text-ink/55">
            Upload JPG, PNG, or WEBP images up to 10MB. They land in the selected folder and become available in every image picker.
          </div>
        )}
      </Card>
    </div>
  );
}
