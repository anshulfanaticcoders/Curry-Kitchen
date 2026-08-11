// Single source of truth for the public origin. NEXT_PUBLIC_APP_URL is inlined
// at build time, so it must be provided as a Docker build ARG in production.
export function getAppUrl(): string {
  const value = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");

  if (value) return value;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_APP_URL is not set. Configure it as a build-time variable before deploying.",
    );
  }

  return "http://localhost:3000";
}
