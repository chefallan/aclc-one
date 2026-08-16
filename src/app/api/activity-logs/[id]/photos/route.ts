import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import sharp from "sharp";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { getStorageProvider } from "@/lib/storage";
import { generateRequestId } from "@/lib/utils";
import { logAudit } from "@/lib/audit";

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: activityLogId } = await params;
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.studentProfileId) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role as never, "photo:upload")) {
    return NextResponse.json({ success: false, requestId, error: "Forbidden" }, { status: 403 });
  }

  try {
    // The log must belong to this student *and* this tenant. Checking both
    // means a valid log id from another org or another student is a 404, not
    // an upload target.
    const log = await prisma.activityLog.findFirst({
      where: {
        id: activityLogId,
        studentId: session.user.studentProfileId,
      },
      select: { id: true },
    });

    if (!log) {
      return NextResponse.json(
        { success: false, requestId, error: "Activity log not found" },
        { status: 404 }
      );
    }

    const form = await req.formData();
    const file = form.get("photo");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, requestId, error: "Attach a photo to upload." },
        { status: 400 }
      );
    }

    if (!ACCEPTED.has(file.type)) {
      return NextResponse.json(
        { success: false, requestId, error: "Photos must be JPEG, PNG, WebP or HEIC." },
        { status: 415 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { success: false, requestId, error: "Photos must be under 8 MB." },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Read dimensions from the bytes rather than trusting anything the client
    // said about them.
    let width: number | undefined;
    let height: number | undefined;
    try {
      const meta = await sharp(buffer).metadata();
      width = meta.width;
      height = meta.height;
    } catch {
      return NextResponse.json(
        { success: false, requestId, error: "That file could not be read as an image." },
        { status: 400 }
      );
    }

    const takenAtRaw = form.get("takenAt");
    const takenAt =
      typeof takenAtRaw === "string" && !Number.isNaN(Date.parse(takenAtRaw))
        ? new Date(takenAtRaw)
        : null;

    const latitude = numericField(form.get("latitude"));
    const longitude = numericField(form.get("longitude"));

    const { key } = await getStorageProvider().upload(buffer, file.name, file.type);

    const photo = await prisma.photoEvidence.create({
      data: {
        // Holds the provider-side storage key, never a public URL. Delivery
        // goes through GET /api/photos/[id], which checks the session first.
        originalUrl: key,
        fileSize: file.size,
        mimeType: file.type,
        width,
        height,
        takenAt,
        latitude,
        longitude,
        activityLogId,
        studentId: session.user.studentProfileId,
      },
      select: { id: true, createdAt: true, mimeType: true, fileSize: true },
    });

    await logAudit({
      action: "CREATE",
      actorId: session.user.id,
      entity: "photo_evidence",
      entityId: photo.id,
      metadata: { activityLogId },
    });

    return NextResponse.json(
      {
        success: true,
        requestId,
        data: { ...photo, url: `/api/photos/${photo.id}` },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Photo upload error:", error);
    return NextResponse.json(
      {
        success: false,
        requestId,
        error: "Unable to save your photo. It stays queued on your device and will retry.",
      },
      { status: 500 }
    );
  }
}

function numericField(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
