"use server";

import { z } from "zod";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { getAdminAlertEmail, sendTransactionalEmail } from "@/lib/email/send";

const contactSchema = z.object({
  name: z.string().trim().min(2, "Please share your name."),
  email: z.string().trim().email("Please use a valid email."),
  message: z.string().trim().min(10, "Tell us a little more so we can help."),
  // Honeypot: real visitors never fill this hidden field.
  company: z.string().max(0).optional().or(z.literal("")),
});

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };

    return entities[character];
  });
}

export async function submitContactMessageAction(
  formData: FormData,
): Promise<ActionResult<undefined>> {
  const parsed = contactSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors);
  }

  if (parsed.data.company) {
    // Bot-filled honeypot: pretend success without sending anything.
    return ok(undefined, "Thanks! We received your message.");
  }

  const { name, email, message } = parsed.data;
  const adminEmail = await getAdminAlertEmail();

  const { sent } = await sendTransactionalEmail({
    to: adminEmail,
    email: {
      subject: `Website message from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
      html: `<p><strong>Name:</strong> ${escapeHtml(name)}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p><p>${escapeHtml(message).replace(/\n/g, "<br />")}</p>`,
    },
  });

  if (!sent) {
    return fail("We could not send your message right now. Please call or email us directly.");
  }

  return ok(undefined, "Thanks! We received your message and will reply soon.");
}
