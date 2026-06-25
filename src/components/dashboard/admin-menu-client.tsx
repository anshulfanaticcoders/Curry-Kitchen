"use client";

import { Loader2, Pencil, Plus } from "lucide-react";
import { type FormEvent, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmActionButton } from "@/components/dashboard/confirm-action-button";
import { Drawer, Tabs } from "@/components/dashboard/interactive";
import { Card, CardHeader, Field, Input, PageHeader, Select, Table, Td, Textarea, Th } from "@/components/dashboard/primitives";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { deleteMenuItemAction, saveMenuItemAction } from "@/lib/actions/admin";
import type { MenuItem } from "@/lib/types";

type ActionResult = Promise<{ ok: boolean; message?: string; error?: string }>;

type ScheduleRow = {
  day: string;
  date: string;
  daal: string;
  sabzi: string;
  rice: string;
  dessert?: string;
};

function statusTone(status: string) {
  return status === "Active" ? "green" as const : "amber" as const;
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

function MenuItemForm({ item, close }: { item?: MenuItem; close: () => void }) {
  const submit = useSubmitAction();

  return (
    <form className="grid gap-5" onSubmit={(event) => submit(event, saveMenuItemAction, close)}>
      {item ? <input type="hidden" name="id" value={item.id} /> : null}
      <Field label="Dish name">
        <Input name="name" defaultValue={item?.name} placeholder="Dal makhani" required />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Type">
          <Select name="type" defaultValue={item?.type ?? "Daal"}>
            {["Daal", "Sabzi", "Rice", "Roti", "Side", "Dessert"].map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </Select>
        </Field>
        <Field label="Spice level">
          <Select name="spice" defaultValue={item?.spice ?? "Medium"}>
            {["Mild", "Medium", "Homestyle"].map((spice) => (
              <option key={spice} value={spice}>{spice}</option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Status">
          <Select name="status" defaultValue={item?.status === "Active" ? "ACTIVE" : "DRAFT"}>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
          </Select>
        </Field>
        <label className="mt-7 flex items-center gap-3 rounded-lg border border-ink/10 bg-ivory p-3 text-sm font-extrabold">
          <input type="hidden" name="vegetarian" value="false" />
          <input type="checkbox" name="vegetarian" value="true" defaultChecked={item?.veg ?? true} className="size-4 accent-[#ff7a1a]" />
          Vegetarian
        </label>
      </div>
      <Field label="Description">
        <Textarea name="description" defaultValue={item?.description} placeholder="Short kitchen note for this dish." />
      </Field>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={close}>
          Cancel
        </Button>
        <Button type="submit">
          <Loader2 className="hidden animate-spin" size={18} />
          {item ? "Save dish" : "Create dish"}
        </Button>
      </div>
    </form>
  );
}

function DishesTab({ items }: { items: MenuItem[] }) {
  return (
    <Card>
      <CardHeader title="All dishes" description={`${items.length} active or draft items in the kitchen library`} />
      <Table>
        <thead>
          <tr>
            <Th>Dish</Th>
            <Th>Type</Th>
            <Th>Spice</Th>
            <Th>Diet</Th>
            <Th>Status</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="transition hover:bg-ivory/60">
              <Td>
                <p className="font-extrabold">{item.name}</p>
                {item.description ? <p className="text-xs font-bold text-ink/45">{item.description}</p> : null}
              </Td>
              <Td className="text-ink/70">{item.type}</Td>
              <Td className="text-ink/60">{item.spice}</Td>
              <Td>{item.veg ? "Veg" : "Non-veg"}</Td>
              <Td>
                <StatusPill tone={statusTone(item.status)}>{item.status}</StatusPill>
              </Td>
              <Td>
                <div className="flex items-center justify-end gap-2">
                  <Drawer
                    title="Edit dish"
                    description={item.name}
                    trigger={({ open }) => (
                      <button
                        type="button"
                        onClick={open}
                        aria-label={`Edit ${item.name}`}
                        className="grid size-9 place-items-center rounded-button border border-ink/10 text-ink/60 transition hover:border-saffron/50 hover:text-ink"
                      >
                        <Pencil size={16} />
                      </button>
                    )}
                  >
                    {({ close }) => <MenuItemForm item={item} close={close} />}
                  </Drawer>
                  <ConfirmActionButton
                    label={`Delete ${item.name}`}
                    title={`Archive ${item.name}?`}
                    description="This dish will leave the kitchen library. Existing weekly menus keep their saved text."
                    confirmLabel="Archive"
                    action={() => deleteMenuItemAction(item.id)}
                  />
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}

function ScheduleTab({ rows }: { rows: ScheduleRow[] }) {
  return (
    <Card>
      <CardHeader title="This week's schedule" description="Dishes assigned to each delivery day." />
      <Table>
        <thead>
          <tr>
            <Th>Day</Th>
            <Th>Daal</Th>
            <Th>Sabzi</Th>
            <Th>Rice</Th>
            <Th>Dessert</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((day) => (
            <tr key={`${day.day}-${day.date}`} className="transition hover:bg-ivory/60">
              <Td className="font-extrabold">
                {day.day}
                <span className="ml-2 text-xs font-bold text-ink/45">{day.date}</span>
              </Td>
              <Td className="text-ink/70">{day.daal}</Td>
              <Td className="text-ink/70">{day.sabzi}</Td>
              <Td className="text-ink/70">{day.rice}</Td>
              <Td className="text-ink/60">{day.dessert ?? "-"}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}

export function AdminMenuClient({ items, weeklyMenu }: { items: MenuItem[]; weeklyMenu: ScheduleRow[] }) {
  return (
    <div>
      <PageHeader
        title="Menu items"
        description="Manage the dish library and review the weekly delivery schedule."
        action={
          <Drawer
            title="Add dish"
            description="Add a dish to the kitchen library."
            trigger={({ open }) => (
              <Button onClick={open}>
                <Plus size={18} />
                Add dish
              </Button>
            )}
          >
            {({ close }) => <MenuItemForm close={close} />}
          </Drawer>
        }
      />
      <Tabs
        items={[
          { id: "dishes", label: `Dishes (${items.length})`, content: <DishesTab items={items} /> },
          { id: "schedule", label: "Weekly schedule", content: <ScheduleTab rows={weeklyMenu} /> },
        ]}
      />
    </div>
  );
}
