import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeMediaFolder } from "@/lib/media";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
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
    default:
      return false;
  }
}

export async function GET() {
  const session = await getCurrentSession();

  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Admin access required." }, { status: 403 });
  }

  const assets = await db.mediaAsset.findMany({ orderBy: { createdAt: "desc" } });

  return NextResponse.json({
    ok: true,
    assets: assets.map((asset) => ({
      id: asset.id,
      fileName: asset.fileName,
      fileUrl: asset.fileUrl,
      folder: asset.folder,
    })),
  });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Only admins can upload media." }, { status: 403 });
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid upload request." }, { status: 400 });
  }

  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ ok: false, error: "Attach an image file." }, { status: 400 });
  }

  const extension = ALLOWED_TYPES[file.type];

  if (!extension) {
    return NextResponse.json(
      { ok: false, error: "Upload a JPG, PNG, or WEBP image." },
      { status: 415 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { ok: false, error: "Upload an image smaller than 10MB." },
      { status: 413 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (!matchesMagicBytes(extension, buffer)) {
    return NextResponse.json(
      { ok: false, error: "File content does not match its type. Export the image again and retry." },
      { status: 415 },
    );
  }

  const storedName = `media-${randomUUID()}.${extension}`;
  const directory = path.join(process.cwd(), "uploads", "media");

  try {
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, storedName), buffer);
  } catch (error) {
    console.error("Media upload failed", error);
    return NextResponse.json(
      { ok: false, error: "Image could not be saved. Please try again." },
      { status: 500 },
    );
  }

  const asset = await db.mediaAsset.create({
    data: {
      fileName: file.name || storedName,
      fileUrl: `/api/uploads/media/${storedName}`,
      folder: normalizeMediaFolder(formData.get("folder")),
      size: file.size,
    },
  });

  return NextResponse.json({
    ok: true,
    asset: { id: asset.id, fileName: asset.fileName, fileUrl: asset.fileUrl, folder: asset.folder },
    url: asset.fileUrl,
  });
}
