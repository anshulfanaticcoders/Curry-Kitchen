import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};

// Menus are public marketing content: no auth, cacheable. File names are
// unguessable UUIDs written only by the admin upload route.
export async function GET(
  _request: Request,
  context: { params: Promise<{ file: string }> },
) {
  const { file } = await context.params;

  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(file) || file.includes("..")) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  const extension = file.split(".").pop()?.toLowerCase() ?? "";
  const contentType = CONTENT_TYPES[extension];

  if (!contentType) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  try {
    const buffer = await readFile(path.join(process.cwd(), "uploads", "menus", file));

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": "inline",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }
}
