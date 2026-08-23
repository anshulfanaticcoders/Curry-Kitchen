"use client";

import { motion } from "framer-motion";
import { FileUp, FolderOpen, ImagePlus, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

type FileDropzoneProps = {
  accept: string;
  disabled?: boolean;
  loading?: boolean;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  title: string;
  description: string;
  compact?: boolean;
  className?: string;
};

export function FileDropzone({
  accept,
  disabled = false,
  loading = false,
  multiple = false,
  onFiles,
  title,
  description,
  compact = false,
  className,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);

  function chooseFiles(files: FileList | null) {
    const selected = Array.from(files ?? []);
    if (selected.length) onFiles(selected);
  }

  return (
    <motion.div
      onDragEnter={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (!disabled) chooseFiles(event.dataTransfer.files);
      }}
      animate={{
        borderColor: dragging ? "rgba(255, 122, 26, 0.95)" : "rgba(7, 7, 7, 0.16)",
        backgroundColor: dragging ? "rgba(255, 122, 26, 0.08)" : "rgba(255, 255, 255, 0.72)",
      }}
      transition={{ duration: 0.2 }}
      className={cn(
        "relative overflow-hidden border border-dashed",
        compact ? "rounded-lg p-4" : "rounded-lg px-6 py-10 sm:px-10 sm:py-12",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.34] [background-image:linear-gradient(rgba(7,7,7,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(7,7,7,0.06)_1px,transparent_1px)] [background-size:20px_20px]" />
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          chooseFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <div className={cn("relative flex items-center", compact ? "gap-4" : "flex-col text-center")}>
        <motion.span
          animate={dragging ? { rotate: [0, -8, 8, 0], y: -3 } : { rotate: 0, y: 0 }}
          transition={{ type: "spring", stiffness: 340, damping: 18 }}
          className={cn(
            "grid shrink-0 place-items-center rounded-full bg-saffron text-ink shadow-[0_10px_24px_rgba(255,122,26,0.25)]",
            compact ? "size-11" : "size-16",
          )}
        >
          {loading ? <Loader2 className="animate-spin" size={compact ? 20 : 26} /> : <FileUp size={compact ? 20 : 26} strokeWidth={2} />}
        </motion.span>
        <div className={cn(compact ? "min-w-0 flex-1" : "mt-5")}> 
          <p className={cn("font-display font-black", compact ? "text-lg" : "text-2xl")}>{loading ? "Uploading..." : title}</p>
          <p className={cn("mt-1.5 font-medium leading-6 text-ink/56", compact ? "text-xs" : "text-sm")}>{description}</p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className={cn(
            "inline-flex shrink-0 items-center justify-center gap-2 rounded-button border border-ink/12 bg-white px-4 text-sm font-extrabold text-ink transition hover:border-saffron hover:text-masala focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron disabled:cursor-not-allowed",
            compact ? "h-10" : "mt-6 h-11",
          )}
        >
          {compact ? <ImagePlus size={17} /> : <FolderOpen size={17} />}
          {compact ? "Choose file" : "Browse files"}
        </button>
      </div>
    </motion.div>
  );
}
