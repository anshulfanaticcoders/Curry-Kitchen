"use client";

import { Loader2, Pencil, Plus } from "lucide-react";
import { type FormEvent, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmActionButton } from "@/components/dashboard/confirm-action-button";
import { Drawer } from "@/components/dashboard/interactive";
import { Card, CardHeader, Field, Input, PageHeader, Select, StatCard, Table, Td, Th } from "@/components/dashboard/primitives";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { deleteCouponAction, saveCouponAction } from "@/lib/actions/admin";
import type { Coupon } from "@/lib/types";

type ActionResult = Promise<{ ok: boolean; message?: string; error?: string }>;

function statusTone(status: string) {
  if (status === "Active") return "green" as const;
  if (status === "Scheduled") return "amber" as const;
  return "ink" as const;
}

function statusValue(status?: string) {
  return status === "Active" ? "ACTIVE" : "DRAFT";
}

function useSubmitAction() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  return function submit(
    event: FormEvent<HTMLFormElement>,
    action: (formData: FormData) => ActionResult,
    close: () => void,
  ) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await action(formData);

      if (result.ok) {
        toast.success(result.message ?? "Saved.");
        close();
        router.refresh();
        return;
      }

      toast.error("Save failed", {
        description: result.error ?? "Please check the fields and try again.",
      });
    });
  };
}

function CouponForm({ coupon, close }: { coupon?: Coupon; close: () => void }) {
  const submit = useSubmitAction();

  return (
    <form className="grid gap-5" onSubmit={(event) => submit(event, saveCouponAction, close)}>
      {coupon ? <input type="hidden" name="id" value={coupon.id} /> : null}
      <Field label="Code">
        <Input name="code" defaultValue={coupon?.code} placeholder="WELCOME15" className="uppercase" required />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Discount type">
          <Select name="type" defaultValue={coupon?.type === "Flat" ? "FLAT" : "PERCENT"}>
            <option value="PERCENT">Percentage</option>
            <option value="FLAT">Flat amount</option>
          </Select>
        </Field>
        <Field label="Value">
          <Input name="value" type="number" step="0.01" min="0" defaultValue={coupon?.value} placeholder="15" required />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Usage limit">
          <Input name="usageLimit" type="number" min="1" defaultValue={coupon?.limit || ""} placeholder="500" />
        </Field>
        <Field label="Status">
          <Select name="status" defaultValue={statusValue(coupon?.status)}>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft / scheduled</option>
          </Select>
        </Field>
      </div>
      <Field label="Expires on">
        <Input name="expiresAt" type="date" defaultValue={coupon?.expiresAt} />
      </Field>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={close}>
          Cancel
        </Button>
        <Button type="submit">
          <Loader2 className="hidden animate-spin" size={18} />
          {coupon ? "Save offer" : "Create offer"}
        </Button>
      </div>
    </form>
  );
}

export function AdminOffersClient({ coupons }: { coupons: Coupon[] }) {
  const active = coupons.filter((coupon) => coupon.status === "Active").length;
  const redemptions = coupons.reduce((total, coupon) => total + coupon.usage, 0);

  return (
    <div>
      <PageHeader
        title="Offers"
        description="Create discount codes and track redemptions."
        action={
          <Drawer
            title="Create offer"
            description="Set up a new discount code."
            trigger={({ open }) => (
              <Button onClick={open}>
                <Plus size={18} />
                Create offer
              </Button>
            )}
          >
            {({ close }) => <CouponForm close={close} />}
          </Drawer>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Active offers" value={String(active)} tone="good" />
        <StatCard label="Total redemptions" value={String(redemptions)} delta="across all codes" />
        <StatCard label="Codes live" value={String(coupons.length)} />
      </div>

      <Card>
        <CardHeader title="All offers" />
        <Table>
          <thead>
            <tr>
              <Th>Code</Th>
              <Th>Discount</Th>
              <Th>Usage</Th>
              <Th>Expires</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((coupon) => (
              <tr key={coupon.id} className="transition hover:bg-ivory/60">
                <Td>
                  <span className="rounded-button bg-ink px-3 py-1 font-mono text-xs font-black uppercase text-saffron">
                    {coupon.code}
                  </span>
                </Td>
                <Td className="font-black">
                  {coupon.type === "Percent" ? `${coupon.value}%` : `$${coupon.value}`}
                </Td>
                <Td className="text-ink/60">
                  {coupon.usage} / {coupon.limit || "Unlimited"}
                </Td>
                <Td className="text-ink/60">{coupon.expires}</Td>
                <Td>
                  <StatusPill tone={statusTone(coupon.status)}>{coupon.status}</StatusPill>
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-2">
                    <Drawer
                      title="Edit offer"
                      description={coupon.code}
                      trigger={({ open }) => (
                        <button
                          type="button"
                          onClick={open}
                          aria-label={`Edit ${coupon.code}`}
                          className="grid size-9 place-items-center rounded-button border border-ink/10 text-ink/60 transition hover:border-saffron/50 hover:text-ink"
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                    >
                      {({ close }) => <CouponForm coupon={coupon} close={close} />}
                    </Drawer>
                    <ConfirmActionButton
                      label={`Delete ${coupon.code}`}
                      title={`Archive ${coupon.code}?`}
                      description="The offer will stop being available at checkout. Existing orders keep their discount."
                      confirmLabel="Archive"
                      action={() => deleteCouponAction(coupon.id)}
                    />
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
