import { after } from "next/server";
import { INVALID_RESET_MESSAGE, resetPassword, resetPasswordSchema } from "@/lib/password-reset";
import { createPasswordChangedEmail } from "@/lib/email/templates";
import { sendTransactionalEmail } from "@/lib/email/send";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  const parsed = resetPasswordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Check your reset details." }, { status: 400, headers });
  try {
    const user = await resetPassword(parsed.data);
    if (!user) return Response.json({ ok: false, error: INVALID_RESET_MESSAGE }, { status: 400, headers });
    after(async () => {
      try {
        await sendTransactionalEmail({ to: user.email, email: await createPasswordChangedEmail({ customerName: user.name }) });
      } catch {
        console.error("[password-reset] Password-change confirmation email failed.");
      }
    });
    return Response.json({ ok: true }, { headers });
  } catch {
    console.error("[password-reset] Password update failed.");
    return Response.json({ ok: false, error: "We could not reset your password. Please try again shortly." }, { status: 503, headers });
  }
}
