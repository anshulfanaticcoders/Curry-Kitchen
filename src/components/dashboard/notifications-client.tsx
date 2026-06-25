"use client";

import { Bell, BellOff, CreditCard, Gift, Package, Settings } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Card, PageHeader } from "@/components/dashboard/primitives";
import { Button } from "@/components/ui/button";
import type { NotificationItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const typeIcon = {
  order: Package,
  payment: CreditCard,
  system: Settings,
  offer: Gift,
} as const;

export function NotificationsClient({ initialItems }: { initialItems: NotificationItem[] }) {
  const [items, setItems] = useState(initialItems);
  const unread = items.filter((item) => !item.read).length;

  function markAllRead() {
    setItems((list) => list.map((item) => ({ ...item, read: true })));
    toast.success("Notifications cleared");
  }

  function markRead(id: string) {
    setItems((list) => list.map((item) => (item.id === id ? { ...item, read: true } : item)));
    toast.success("Marked read");
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Delivery updates, payments, and offers."
        action={
          <Button variant="secondary" onClick={markAllRead}>
            <BellOff size={18} />
            Mark all read
          </Button>
        }
      />

      <div className="mb-5 flex items-center gap-3 rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
        <span className="grid size-10 place-items-center rounded-button bg-saffron/15 text-masala">
          <Bell size={18} />
        </span>
        <p className="text-sm font-bold">
          {unread > 0 ? (
            <>
              You have <span className="text-masala">{unread} unread</span> notifications.
            </>
          ) : (
            "You're all caught up."
          )}
        </p>
      </div>

      <Card>
        <ul>
          {items.map((item) => {
            const Icon = typeIcon[item.type] ?? Settings;
            return (
              <li
                key={item.id}
                className={cn(
                  "flex items-start gap-4 border-b border-ink/8 p-4 transition last:border-0",
                  !item.read && "bg-saffron/[0.04]",
                )}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-button bg-ivory text-ink/60">
                  <Icon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-extrabold">{item.title}</p>
                    {!item.read ? <span className="size-2 rounded-full bg-masala" /> : null}
                  </div>
                  <p className="mt-0.5 text-sm leading-6 text-ink/60">{item.body}</p>
                  <p className="mt-1 text-xs font-bold text-ink/40">{item.time}</p>
                </div>
                {!item.read ? (
                  <button
                    onClick={() => markRead(item.id)}
                    className="shrink-0 rounded-button border border-ink/10 px-3 py-1.5 text-xs font-extrabold text-ink/60 transition hover:border-saffron/50 hover:text-ink"
                  >
                    Mark read
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
