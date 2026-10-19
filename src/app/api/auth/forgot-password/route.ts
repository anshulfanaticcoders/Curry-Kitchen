import { after } from "next/server";
import { forgotPasswordSchema, passwordResetOrigin, requestPasswordReset, RESET_REQUEST_MESSAGE } from "@/lib/password-reset";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  const parsed = forgotPasswordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, error: "Enter a valid email address." }, { status: 400, headers });
  try {
    passwordResetOrigin();
    if (!process.env.RESEND_API_KEY || (process.env.NODE_ENV === "production" && !process.env.MAIL_FROM)) throw new Error("Mail unavailable");
  } catch {
    return Response.json({ ok: false, error: "Password recovery is temporarily unavailable. Please contact our team or try again later." }, { status: 503, headers });
  }

  // Lookups and email delivery happen after the same response for every address.
  after(async () => {
    try {
      await requestPasswordReset(parsed.data.email);
    } catch {
      console.error("[password-reset] Recovery request failed. Check database and email service availability.");
    }
  });
  return Response.json({ ok: true, message: RESET_REQUEST_MESSAGE }, { headers });
}
