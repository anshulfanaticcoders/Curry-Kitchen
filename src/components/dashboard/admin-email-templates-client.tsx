"use client";

import { Loader2, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardHeader, Field, Input, PageHeader, Select, Textarea } from "@/components/dashboard/primitives";
import { Button } from "@/components/ui/button";
import { resetEmailTemplateAction, saveEmailTemplateAction } from "@/lib/actions/admin";
import type { EmailTemplateOverrides } from "@/lib/email/template-overrides";
import {
  DEFAULT_EMAIL_BRAND,
  EMAIL_TEMPLATE_IDS,
  EMAIL_TEMPLATES,
  type EmailTemplateFields,
  type EmailTemplateId,
  renderEmailTemplate,
} from "@/lib/email/template-registry";
import { cn } from "@/lib/utils";

const FIELD_HELP: Record<keyof EmailTemplateFields, string> = {
  subject: "Inbox subject line.",
  heading: "Large title inside the email.",
  intro: "Opening line under the title.",
  body: "Blank line starts a new paragraph. Wrap text in ** for bold. A line whose variables are all empty is hidden.",
  ctaLabel: "Button text. Leave empty to hide the button.",
};

function resolveFields(id: EmailTemplateId, overrides: EmailTemplateOverrides): EmailTemplateFields {
  return { ...EMAIL_TEMPLATES[id].defaults, ...overrides[id] };
}

export function AdminEmailTemplatesClient({
  overrides,
  appUrl,
}: {
  overrides: EmailTemplateOverrides;
  appUrl: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<EmailTemplateId>(EMAIL_TEMPLATE_IDS[0]);
  const [fields, setFields] = useState<EmailTemplateFields>(() => resolveFields(activeId, overrides));

  const definition = EMAIL_TEMPLATES[activeId];
  const customized = Boolean(overrides[activeId]);
  const preview = renderEmailTemplate({
    id: activeId,
    variables: definition.variables,
    ctaUrl: `${appUrl}${definition.ctaPath}`,
    fields,
  });

  function select(id: EmailTemplateId) {
    setActiveId(id);
    setFields(resolveFields(id, overrides));
  }

  function update<K extends keyof EmailTemplateFields>(key: K, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await saveEmailTemplateAction(formData);
      if (result.ok) {
        toast.success(result.message ?? "Email template saved.");
        router.refresh();
        return;
      }
      toast.error("Template could not be saved", { description: result.error });
    });
  }

  function reset() {
    const formData = new FormData();
    formData.set("templateId", activeId);

    startTransition(async () => {
      const result = await resetEmailTemplateAction(formData);
      if (result.ok) {
        setFields(EMAIL_TEMPLATES[activeId].defaults);
        toast.success(result.message ?? "Template reset.");
        router.refresh();
        return;
      }
      toast.error("Template could not be reset", { description: result.error });
    });
  }

  const groups: Array<{ title: string; audience: "customer" | "admin" }> = [
    { title: "Customer emails", audience: "customer" },
    { title: "Admin alerts", audience: "admin" },
  ];

  return (
    <>
      <PageHeader
        title="Email templates"
        description="Edit the subject and wording of every automatic email. Variables like {{customerName}} are filled in when the email is sent."
      />

      <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
        <div className="lg:hidden">
          <Field label="Template">
            <Select value={activeId} onChange={(event) => select(event.target.value as EmailTemplateId)}>
              {groups.map((group) => (
                <optgroup key={group.audience} label={group.title}>
                  {EMAIL_TEMPLATE_IDS.filter((id) => EMAIL_TEMPLATES[id].audience === group.audience).map((id) => (
                    <option key={id} value={id}>
                      {EMAIL_TEMPLATES[id].label}
                      {overrides[id] ? " (edited)" : ""}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </Field>
        </div>

        <Card className="hidden self-start p-3 lg:block">
          {groups.map((group) => (
            <div key={group.audience} className="mb-3 last:mb-0">
              <p className="px-3 pb-1 pt-2 text-[11px] font-black uppercase tracking-[0.16em] text-ink/40">{group.title}</p>
              {EMAIL_TEMPLATE_IDS.filter((id) => EMAIL_TEMPLATES[id].audience === group.audience).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => select(id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold transition",
                    activeId === id ? "bg-saffron/15 text-saffron" : "text-ink/70 hover:bg-ink/5 hover:text-ink",
                  )}
                >
                  <span>{EMAIL_TEMPLATES[id].label}</span>
                  {overrides[id] ? <span className="size-1.5 shrink-0 rounded-full bg-saffron" aria-label="Edited" /> : null}
                </button>
              ))}
            </div>
          ))}
        </Card>

        <div className="grid min-w-0 gap-5 xl:grid-cols-2">
          <form onSubmit={save} className="min-w-0">
            <Card>
              <CardHeader
                title={definition.label}
                description={definition.description}
                action={
                  customized ? (
                    <Button type="button" variant="secondary" onClick={reset} disabled={isPending} className="h-10 px-4 text-sm">
                      <RotateCcw size={15} /> Reset to default
                    </Button>
                  ) : null
                }
              />
              <div className="grid gap-4 p-5">
                <input type="hidden" name="templateId" value={activeId} />
                <Field label="Subject" hint={FIELD_HELP.subject}>
                  <Input name="subject" value={fields.subject} onChange={(event) => update("subject", event.target.value)} required maxLength={200} />
                </Field>
                <Field label="Heading" hint={FIELD_HELP.heading}>
                  <Input name="heading" value={fields.heading} onChange={(event) => update("heading", event.target.value)} maxLength={200} />
                </Field>
                <Field label="Intro" hint={FIELD_HELP.intro}>
                  <Textarea name="intro" value={fields.intro} onChange={(event) => update("intro", event.target.value)} maxLength={1000} className="min-h-20" />
                </Field>
                <Field label="Body" hint={FIELD_HELP.body}>
                  <Textarea name="body" value={fields.body} onChange={(event) => update("body", event.target.value)} maxLength={5000} className="min-h-44 font-mono text-sm" />
                </Field>
                <Field label="Button label" hint={FIELD_HELP.ctaLabel}>
                  <Input name="ctaLabel" value={fields.ctaLabel} onChange={(event) => update("ctaLabel", event.target.value)} maxLength={80} />
                </Field>

                <div className="rounded-xl bg-frost p-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-ink/45">Available variables</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[...Object.entries(definition.variables), ...Object.entries(DEFAULT_EMAIL_BRAND)].map(([name, sample]) => (
                      <button
                        key={name}
                        type="button"
                        title={`Example: ${sample}`}
                        onClick={() => update("body", `${fields.body}${fields.body.endsWith("\n") || !fields.body ? "" : " "}{{${name}}}`)}
                        className="rounded-full border border-ink/10 bg-white px-2.5 py-1 font-mono text-xs font-bold text-ink/70 transition hover:border-saffron hover:text-saffron"
                      >
                        {`{{${name}}}`}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-ink/45">
                    Click a variable to add it to the body. Business details (name, phone, delivery window) come from Settings. The button link is fixed to {definition.ctaPath}.
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={isPending}>
                    {isPending ? <Loader2 className="animate-spin" size={16} /> : null}
                    {isPending ? "Saving…" : "Save template"}
                  </Button>
                </div>
              </div>
            </Card>
          </form>

          <Card className="min-w-0 self-start">
            <CardHeader title="Preview" description="Filled with example values. Updates as you type." />
            <div className="p-5">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-ink/45">Subject</p>
              <p className="mt-1 break-words font-bold">{preview.subject || <span className="text-ink/35">(empty)</span>}</p>
              <iframe
                title="Email preview"
                sandbox=""
                srcDoc={preview.html}
                className="mt-4 h-[720px] w-full rounded-xl border border-ink/10 bg-cream"
              />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
