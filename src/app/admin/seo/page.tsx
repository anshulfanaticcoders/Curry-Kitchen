"use client";

import { Globe, Pencil } from "lucide-react";
import { Drawer, Toggle } from "@/components/dashboard/interactive";
import { Card, CardHeader, Field, Input, PageHeader, Table, Td, Textarea, Th } from "@/components/dashboard/primitives";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { seoEntries } from "@/lib/mock-data";
import type { SeoEntry } from "@/lib/types";

function SearchPreview({ entry }: { entry: SeoEntry }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-ivory p-4">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-ink/45">Search preview</p>
      <p className="mt-3 text-xs text-leaf">currykitchen.ca{entry.path}</p>
      <p className="mt-1 line-clamp-1 text-lg font-bold text-[#1a0dab]">{entry.title}</p>
      <p className="mt-1 line-clamp-2 text-sm text-ink/64">{entry.description}</p>
    </div>
  );
}

export default function AdminSeoPage() {
  const indexed = seoEntries.filter((entry) => entry.indexed).length;

  return (
    <div>
      <PageHeader
        title="SEO"
        description="Manage page titles, meta descriptions, and indexing."
      />

      <Card className="mb-6 p-5">
        <div className="flex flex-wrap items-center gap-4">
          <span className="grid size-11 place-items-center rounded-button bg-saffron/15 text-masala">
            <Globe size={20} />
          </span>
          <div>
            <p className="font-extrabold">
              {indexed} of {seoEntries.length} pages indexable
            </p>
            <p className="text-sm text-ink/55">Sitemap auto-generated at /sitemap.xml</p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Pages" />
        <Table>
          <thead>
            <tr>
              <Th>Page</Th>
              <Th>Meta title</Th>
              <Th>Index</Th>
              <Th className="text-right">Edit</Th>
            </tr>
          </thead>
          <tbody>
            {seoEntries.map((entry) => (
              <tr key={entry.id} className="transition hover:bg-ivory/60">
                <Td>
                  <p className="font-extrabold">{entry.page}</p>
                  <p className="text-xs font-bold text-ink/45">{entry.path}</p>
                </Td>
                <Td className="max-w-md truncate text-ink/65">{entry.title}</Td>
                <Td>
                  <StatusPill tone={entry.indexed ? "green" : "ink"}>
                    {entry.indexed ? "Indexed" : "No-index"}
                  </StatusPill>
                </Td>
                <Td>
                  <div className="flex justify-end">
                    <Drawer
                      title="Edit SEO"
                      description={entry.page}
                      trigger={({ open }) => (
                        <button
                          onClick={open}
                          aria-label={`Edit SEO for ${entry.page}`}
                          className="grid size-9 place-items-center rounded-button border border-ink/10 text-ink/60 transition hover:border-saffron/50 hover:text-ink"
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                      footer={({ close }) => (
                        <div className="flex justify-end gap-3">
                          <Button variant="secondary" onClick={close}>
                            Close
                          </Button>
                        </div>
                      )}
                    >
                      {({ close }) => (
                        <form
                          className="grid gap-5"
                          onSubmit={(event) => {
                            event.preventDefault();
                            close();
                          }}
                        >
                          <SearchPreview entry={entry} />
                          <Field label="Meta title" hint={`${entry.title.length} / 60 characters`}>
                            <Input defaultValue={entry.title} />
                          </Field>
                          <Field label="Meta description" hint={`${entry.description.length} / 160 characters`}>
                            <Textarea defaultValue={entry.description} />
                          </Field>
                          <Field label="URL path">
                            <Input defaultValue={entry.path} />
                          </Field>
                          <Toggle
                            label="Allow search indexing"
                            description="Let Google and other engines index this page."
                            defaultChecked={entry.indexed}
                          />
                        </form>
                      )}
                    </Drawer>
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
