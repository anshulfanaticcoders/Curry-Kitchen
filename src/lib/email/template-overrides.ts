import "server-only";

import { db } from "@/lib/db";
import {
  EMAIL_TEMPLATE_FIELD_NAMES,
  type EmailTemplateFields,
  type EmailTemplateId,
  isEmailTemplateId,
} from "@/lib/email/template-registry";

export const EMAIL_TEMPLATES_SETTING_KEY = "email_templates";

export type EmailTemplateOverrides = Partial<Record<EmailTemplateId, Partial<EmailTemplateFields>>>;

export function emailTemplateOverridesFromValue(value: unknown): EmailTemplateOverrides {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const overrides: EmailTemplateOverrides = {};

  for (const [id, fields] of Object.entries(value as Record<string, unknown>)) {
    if (!isEmailTemplateId(id) || !fields || typeof fields !== "object") continue;

    const candidate = fields as Record<string, unknown>;
    const clean: Partial<EmailTemplateFields> = {};

    for (const name of EMAIL_TEMPLATE_FIELD_NAMES) {
      if (typeof candidate[name] === "string") clean[name] = candidate[name];
    }

    overrides[id] = clean;
  }

  return overrides;
}

// Never throws: a missing table or DB outage falls back to the built-in copy.
export async function getEmailTemplateOverrides(): Promise<EmailTemplateOverrides> {
  try {
    const record = await db.setting.findUnique({ where: { key: EMAIL_TEMPLATES_SETTING_KEY } });
    return emailTemplateOverridesFromValue(record?.value);
  } catch {
    return {};
  }
}
