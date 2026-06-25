"use client";

import Link from "next/link";
import { Loader2, Pencil, Plus } from "lucide-react";
import { type FormEvent, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmActionButton } from "@/components/dashboard/confirm-action-button";
import { Drawer, Tabs } from "@/components/dashboard/interactive";
import { Card, CardHeader, Field, Input, PageHeader, Select, Table, Td, Textarea, Th } from "@/components/dashboard/primitives";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { deleteCategoryAction, saveCategoryAction } from "@/lib/actions/admin";
import type { Category } from "@/lib/types";

type ActionResult = Promise<{ ok: boolean; message?: string; error?: string }>;

type TaxRow = {
  id: string;
  name: string;
  category: string;
  taxRate: number;
  status: string;
};

function statusTone(status?: string) {
  if (status === "Active") return "green" as const;
  if (status === "Archived") return "red" as const;
  return "amber" as const;
}

function statusValue(status?: string) {
  if (status === "Active") return "ACTIVE";
  if (status === "Archived") return "ARCHIVED";
  return "DRAFT";
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

function CategoryForm({ category, close }: { category?: Category; close: () => void }) {
  const submit = useSubmitAction();

  return (
    <form className="grid gap-5" onSubmit={(event) => submit(event, saveCategoryAction, close)}>
      {category ? <input type="hidden" name="id" value={category.id} /> : null}
      <Field label="Name">
        <Input name="name" defaultValue={category?.name} placeholder="Monthly" required />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Slug">
          <Input name="slug" defaultValue={category?.slug} placeholder="monthly" />
        </Field>
        <Field label="Status">
          <Select name="status" defaultValue={statusValue(category?.status)}>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </Select>
        </Field>
      </div>
      <Field label="Sort order">
        <Input name="sortOrder" type="number" min="0" defaultValue="0" />
      </Field>
      <Field label="Description">
        <Textarea name="description" defaultValue={category?.description} placeholder="Full-month tiffin plans." />
      </Field>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={close}>
          Cancel
        </Button>
        <Button type="submit">
          <Loader2 className="hidden animate-spin" size={18} />
          {category ? "Save category" : "Create category"}
        </Button>
      </div>
    </form>
  );
}

function CategoriesTab({ categories }: { categories: Category[] }) {
  return (
    <Card>
      <CardHeader
        title="Categories"
        description="Group plans for storefront filters and reporting."
        action={
          <Drawer
            title="Add category"
            trigger={({ open }) => (
              <Button onClick={open} className="h-10 px-4">
                <Plus size={16} />
                Add
              </Button>
            )}
          >
            {({ close }) => <CategoryForm close={close} />}
          </Drawer>
        }
      />
      <Table>
        <thead>
          <tr>
            <Th>Name</Th>
            <Th>Slug</Th>
            <Th>Plans</Th>
            <Th>Description</Th>
            <Th>Status</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => (
            <tr key={category.id} className="transition hover:bg-ivory/60">
              <Td className="font-extrabold">{category.name}</Td>
              <Td className="text-ink/55">/{category.slug}</Td>
              <Td>{category.count}</Td>
              <Td className="max-w-sm text-ink/60">{category.description}</Td>
              <Td>
                <StatusPill tone={statusTone(category.status)}>{category.status ?? "Active"}</StatusPill>
              </Td>
              <Td>
                <div className="flex items-center justify-end gap-2">
                  <Drawer
                    title={`Edit ${category.name}`}
                    trigger={({ open }) => (
                      <button
                        type="button"
                        onClick={open}
                        aria-label={`Edit ${category.name}`}
                        className="grid size-9 place-items-center rounded-button border border-ink/10 text-ink/60 transition hover:border-saffron/50 hover:text-ink"
                      >
                        <Pencil size={16} />
                      </button>
                    )}
                  >
                    {({ close }) => <CategoryForm category={category} close={close} />}
                  </Drawer>
                  <ConfirmActionButton
                    label={`Delete ${category.name}`}
                    title={`Archive ${category.name}?`}
                    description="The category will stop appearing in admin selectors. Existing packages keep their saved category until changed."
                    confirmLabel="Archive"
                    action={() => deleteCategoryAction(category.id)}
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

function TaxTab({ rows }: { rows: TaxRow[] }) {
  return (
    <Card>
      <CardHeader
        title="Package tax"
        description="Tax is stored per package so trial, monthly, and student plans can use different rates."
        action={
          <Link href="/admin/packages" className="text-sm font-extrabold text-masala hover:underline">
            Edit package tax
          </Link>
        }
      />
      <Table>
        <thead>
          <tr>
            <Th>Package</Th>
            <Th>Category</Th>
            <Th>Tax rate</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="transition hover:bg-ivory/60">
              <Td className="font-extrabold">{row.name}</Td>
              <Td className="text-ink/60">{row.category}</Td>
              <Td className="font-black">{(row.taxRate * 100).toFixed(2)}%</Td>
              <Td>
                <StatusPill tone={statusTone(row.status)}>{row.status}</StatusPill>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}

export function AdminCategoriesClient({
  categories,
  taxRows,
}: {
  categories: Category[];
  taxRows: TaxRow[];
}) {
  return (
    <div>
      <PageHeader
        title="Categories & tax"
        description="Organize plans and review package-level tax rules."
      />
      <Tabs
        items={[
          { id: "categories", label: `Categories (${categories.length})`, content: <CategoriesTab categories={categories} /> },
          { id: "tax", label: `Tax (${taxRows.length})`, content: <TaxTab rows={taxRows} /> },
        ]}
      />
    </div>
  );
}
