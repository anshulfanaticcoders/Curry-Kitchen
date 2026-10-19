import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAppUrl } from "@/lib/app-url";
import { passwordResetSessionIdentifier } from "@/lib/auth-session";
import { hashPassword } from "@/lib/password";
import { createPasswordResetEmail } from "@/lib/email/templates";
import { sendTransactionalEmail } from "@/lib/email/send";

export const RESET_EXPIRY_MINUTES = 30;
export const RESET_REQUEST_MESSAGE = "If an account exists for that email, a password reset link will arrive shortly. Check your inbox and spam folder. You can request another link in 5 minutes.";
export const INVALID_RESET_MESSAGE = "This reset link is invalid or has expired. Please request a new link.";

export const forgotPasswordSchema = z.object({ email: z.string().trim().toLowerCase().email().max(254) });
export const resetPasswordSchema = z.object({
  token: z.string().regex(/^[a-zA-Z0-9_-]{1,100}\.[a-f0-9]{64}$/, INVALID_RESET_MESSAGE),
  password: z.string().min(8, "Use at least 8 characters.").max(72, "Use no more than 72 characters.")
    .refine((value) => Buffer.byteLength(value, "utf8") <= 72, "Password must be no more than 72 bytes."),
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, { message: "Passwords do not match.", path: ["confirmPassword"] });

export function passwordResetOrigin() {
  const url = new URL(getAppUrl());
  if (url.username || url.password || !["https:", "http:"].includes(url.protocol)
    || (process.env.NODE_ENV === "production" && url.protocol !== "https:")) {
    throw new Error("Password reset requires a trusted HTTPS application URL.");
  }
  return url.origin;
}

function tokenHash(secret: string, passwordHash: string) {
  // Binding to the current password invalidates every outstanding link on change.
  return createHash("sha256").update(`${secret}:${passwordHash}`).digest("hex");
}

async function claimResetRequest(userId: string, now: Date) {
  const identifier = `password-reset-rate:${userId}`;
  const token = "cooldown";
  const expires = new Date(now.getTime() + 5 * 60_000);
  const renewed = await db.verificationToken.updateMany({
    where: { identifier, token, expires: { lte: now } }, data: { expires },
  });
  if (renewed.count === 1) return true;
  try {
    await db.verificationToken.create({ data: { identifier, token, expires } });
    return true;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return false;
    throw error;
  }
}

export async function requestPasswordReset(email: string) {
  const user = await db.user.findUnique({ where: { email }, select: { id: true, name: true, email: true, passwordHash: true } });
  if (!user?.passwordHash) return;
  const now = new Date();
  if (!(await claimResetRequest(user.id, now))) return;

  const secret = randomBytes(32).toString("hex");
  const identifier = `password-reset-link:${user.id}`;
  const token = tokenHash(secret, user.passwordHash);
  await db.verificationToken.deleteMany({ where: { identifier, expires: { lte: now } } });
  await db.verificationToken.create({ data: {
    identifier, token, expires: new Date(now.getTime() + RESET_EXPIRY_MINUTES * 60_000),
  } });
  // Fragments never enter HTTP request URLs, access logs, or referrer headers.
  const url = new URL("/reset-password", passwordResetOrigin());
  url.hash = new URLSearchParams({ token: `${user.id}.${secret}` }).toString();
  let sent = false;
  try {
    const result = await sendTransactionalEmail({
      to: user.email,
      email: await createPasswordResetEmail({ customerName: user.name ?? "there", resetUrl: url.toString(), expiryMinutes: RESET_EXPIRY_MINUTES }),
    });
    sent = result.sent;
  } finally {
    if (!sent) {
      await db.verificationToken.deleteMany({ where: { identifier, token } });
      console.error("[password-reset] Reset email was not sent. Check mail configuration/provider logs.");
    }
  }
}

class InvalidResetError extends Error {}

export async function resetPassword(input: z.infer<typeof resetPasswordSchema>) {
  const [userId, secret] = input.token.split(".");
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, passwordHash: true } });
  if (!user?.passwordHash) return null;
  const identifier = `password-reset-link:${user.id}`;
  const token = tokenHash(secret, user.passwordHash);
  const existing = await db.verificationToken.findUnique({ where: { identifier_token: { identifier, token } } });
  if (!existing || existing.expires <= new Date()) return null;
  const passwordHash = await hashPassword(input.password);

  try {
    await db.$transaction(async (tx) => {
      // Compare-and-set plus token consumption in one transaction prevents reuse,
      // concurrent resets, and stale links overwriting a more recent password.
      const changed = await tx.user.updateMany({ where: { id: user.id, passwordHash: user.passwordHash }, data: { passwordHash } });
      if (changed.count !== 1) throw new InvalidResetError();
      const consumed = await tx.verificationToken.deleteMany({ where: { identifier, token, expires: { gt: new Date() } } });
      if (consumed.count !== 1) throw new InvalidResetError();
      await tx.verificationToken.deleteMany({ where: { identifier } });
      const version = { identifier: passwordResetSessionIdentifier(user.id), token: "version" };
      const expires = new Date();
      await tx.verificationToken.upsert({ where: { identifier_token: version }, create: { ...version, expires }, update: { expires } });
      await tx.session.deleteMany({ where: { userId: user.id } });
    });
  } catch (error) {
    if (error instanceof InvalidResetError) return null;
    throw error;
  }
  return { email: user.email, name: user.name ?? "there" };
}
