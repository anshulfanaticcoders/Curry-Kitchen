import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";

export const runtime = "nodejs";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  pdf: "application/pdf",
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ file: string }> },
) {
  const { file } = await context.params;
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }

  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(file) || file.includes("..")) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  const isAdmin = session.user.role === "ADMIN";
  const isOwner = file.startsWith(`${session.user.id}-`);

  if (!isAdmin && !isOwner) {
    return NextResponse.json({ ok: false, error: "Not allowed." }, { status: 403 });
  }

  const extension = file.split(".").pop()?.toLowerCase() ?? "";
  const contentType = CONTENT_TYPES[extension];

  if (!contentType) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  try {
    const buffer = await readFile(path.join(process.cwd(), "uploads", "verification", file));

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": extension === "pdf" ? "attachment" : "inline",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }
}
