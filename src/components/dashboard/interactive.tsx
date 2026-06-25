"use client";

import { X } from "lucide-react";
import { type ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

/* Pill tabs with swappable panels */
export function Tabs({ items }: { items: Array<{ id: string; label: string; content: ReactNode }> }) {
  const [active, setActive] = useState(items[0]?.id);
  return (
    <div>
      <div className="flex flex-wrap gap-2" role="tablist">
        {items.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={active === item.id}
            onClick={() => setActive(item.id)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-extrabold transition",
              active === item.id
                ? "border-ink bg-ink text-ivory"
                : "border-ink/10 bg-white text-ink/60 hover:border-saffron/40 hover:text-ink",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="mt-6">{items.find((item) => item.id === active)?.content}</div>
    </div>
  );
}

/* Switch toggle */
export function Toggle({
  label,
  description,
  defaultChecked = false,
}: {
  label: string;
  description?: string;
  defaultChecked?: boolean;
}) {
  const [on, setOn] = useState(defaultChecked);
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-ink/10 bg-white p-4">
      <div>
        <p className="text-sm font-extrabold">{label}</p>
        {description ? <p className="mt-0.5 text-xs font-medium text-ink/50">{description}</p> : null}
      </div>
      <button
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => setOn((value) => !value)}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition",
          on ? "bg-saffron" : "bg-ink/15",
        )}
      >
        <span
          className={cn(
            "absolute top-1 size-5 rounded-full bg-white shadow transition-all",
            on ? "left-6" : "left-1",
          )}
        />
      </button>
    </div>
  );
}

/* Slide-over drawer. trigger + children are render props. */
export function Drawer({
  title,
  description,
  trigger,
  children,
  footer,
}: {
  title: string;
  description?: string;
  trigger: (api: { open: () => void }) => ReactNode;
  children: (api: { close: () => void }) => ReactNode;
  footer?: (api: { close: () => void }) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <>
      {trigger({ open: () => setOpen(true) })}
      {open ? (
        <div className="fixed inset-0 z-[60]">
          <button
            className="absolute inset-0 bg-ink/55 backdrop-blur-sm"
            aria-label="Close panel"
            onClick={close}
          />
          <div className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col bg-white shadow-[0_0_80px_rgba(7,7,7,0.3)]">
            <div className="flex items-start justify-between gap-4 border-b border-ink/10 p-5">
              <div>
                <h2 className="font-display text-2xl font-black">{title}</h2>
                {description ? <p className="mt-1 text-sm text-ink/55">{description}</p> : null}
              </div>
              <button
                className="grid size-9 place-items-center rounded-button border border-ink/10 text-ink/60 hover:text-ink"
                onClick={close}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">{children({ close })}</div>
            {footer ? <div className="border-t border-ink/10 p-5">{footer({ close })}</div> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
