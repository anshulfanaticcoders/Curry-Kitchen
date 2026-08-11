"use client";

import { CalendarRange, FileText, Pencil, UploadCloud } from "lucide-react";
import Link from "next/link";
import { ConfirmActionButton } from "@/components/dashboard/confirm-action-button";
import { Card, CardHeader, PageHeader, Table, Td, Th } from "@/components/dashboard/primitives";
import { ButtonLink } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { deleteMenuUploadAction } from "@/lib/actions/admin";
import type { AdminMenuUpload } from "@/lib/types";

export function AdminMenuClient({ uploads }: { uploads: AdminMenuUpload[] }) {
  return (
    <div>
      <PageHeader
        title="Menus"
        description="Upload your weekly Canva menus and schedule when each one shows on the website."
        action={
          <ButtonLink href="/admin/menu/new">
            <UploadCloud size={18} />
            Upload menu
          </ButtonLink>
        }
      />
      <Card>
        <CardHeader
          title="Scheduled menus"
          description={
            uploads.length
              ? `${uploads.length} scheduled — the website shows up to 4 current or upcoming menus.`
              : "Upload your first menu to show it on the website."
          }
        />
        {uploads.length ? (
          <Table>
            <thead>
              <tr>
                <Th>Menu</Th>
                <Th>Dates</Th>
                <Th>File</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {uploads.map((upload) => (
                <tr key={upload.id} className="transition hover:bg-ivory/60">
                  <Td className="font-extrabold">{upload.title}</Td>
                  <Td className="text-ink/70">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarRange size={14} className="text-ink/40" />
                      {upload.dateRangeLabel}
                    </span>
                  </Td>
                  <Td>
                    <a
                      href={upload.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-extrabold text-masala underline-offset-2 hover:underline"
                    >
                      <FileText size={14} />
                      {upload.isPdf ? "View PDF" : "View image"}
                    </a>
                  </Td>
                  <Td>
                    <StatusPill tone={upload.expired ? "ink" : "green"}>
                      {upload.expired ? "Expired" : "Scheduled"}
                    </StatusPill>
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/menu/${upload.id}/edit`}
                        aria-label={`Edit ${upload.title}`}
                        className="grid size-9 place-items-center rounded-button border border-ink/10 text-ink/60 transition hover:border-saffron/50 hover:text-ink"
                      >
                        <Pencil size={16} />
                      </Link>
                      <ConfirmActionButton
                        label={`Delete ${upload.title}`}
                        title={`Delete ${upload.title}?`}
                        description="The menu and its file are removed from the website immediately."
                        confirmLabel="Delete"
                        action={() => deleteMenuUploadAction(upload.id)}
                      />
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <div className="m-6 rounded-lg border border-dashed border-ink/15 bg-ivory p-8 text-center text-sm font-bold text-ink/55">
            No menus uploaded yet. Use “Upload menu” to schedule your first one.
          </div>
        )}
      </Card>
    </div>
  );
}
