import "server-only";

import { db } from "@/lib/db";

export function passwordResetSessionIdentifier(userId: string) {
  return `password-reset-session:${userId}`;
}

export async function getPasswordResetVersion(userId: string) {
  // This namespaced marker is permanent: expires holds the password-change time,
  // not a link expiry. Only password-reset link/rate-limit rows may be cleaned up.
  const marker = await db.verificationToken.findUnique({
    where: { identifier_token: { identifier: passwordResetSessionIdentifier(userId), token: "version" } },
  });
  return marker?.expires.getTime() ?? 0;
}

export async function isPasswordSessionCurrent(token: { sub?: string; passwordResetVersion?: number }) {
  if (!token.sub) return false;
  return (token.passwordResetVersion ?? 0) === await getPasswordResetVersion(token.sub);
}
