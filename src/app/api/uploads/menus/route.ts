import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

function matchesMagicBytes(extension: string, buffer: Buffer) {
  if (buffer.length < 12) return false;

  switch (extension) {
    case "jpg":
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case "png":
      return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    case "webp":
      return (
        buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
        buffer.subarray(8, 12).toString("ascii") === "WEBP"
      );
    case "pdf":
      return buffer.subarray(0, 4).toString("ascii") === "%PDF";
    default:
      return false;
  }
}

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json(
      { ok: false, error: "Only admins can upload menus." },
      { status: 403 },
    );
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid upload request." }, { status: 400 });
  }

  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ ok: false, error: "Attach a menu file." }, { status: 400 });
  }

  const extension = ALLOWED_TYPES[file.type];

  if (!extension) {
    return NextResponse.json(
      { ok: false, error: "Upload a JPG, PNG, WEBP, or PDF file." },
      { status: 415 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { ok: false, error: "Upload a menu smaller than 10MB." },
      { status: 413 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (!matchesMagicBytes(extension, buffer)) {
    return NextResponse.json(
      { ok: false, error: "File content does not match its type. Export the menu again and retry." },
      { status: 415 },
    );
  }

  const fileName = `menu-${randomUUID()}.${extension}`;
  const directory = path.join(process.cwd(), "uploads", "menus");

  try {
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, fileName), buffer);
  } catch (error) {
    console.error("Menu upload failed", error);
    return NextResponse.json(
      { ok: false, error: "Menu could not be saved. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, url: `/api/uploads/menus/${fileName}` });
}
