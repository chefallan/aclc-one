import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasAnyPermission } from "@/lib/permissions";
import { getStorageProvider, type ImageVariant } from "@/lib/storage";
import { generateRequestId } from "@/lib/utils";

/**
 * The only way a stored photo reaches a browser.
 *
 * Bytes are streamed through this handler rather than redirecting to a provider
 * URL, so no shareable link to a student's photograph ever exists outside the
 * server. Caching is private and short for the same reason.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const photo = await prisma.photoEvidence.findFirst({
      where: { id },
      select: {
        originalUrl: true,
        mimeType: true,
        studentId: true,
        activityLog: {
          select: {
            assignment: {
              select: {
                teacherId: true,
                coordinatorId: true,
                // supervisorId points at WorkplaceSupervisor, not User — the
                // session carries a user id, so resolve through to the account.
                supervisor: { select: { userId: true } },
              },
            },
          },
        },
      },
    });

    if (!photo) {
      return NextResponse.json({ success: false, requestId, error: "Not found" }, { status: 404 });
    }

    if (!canView(session.user, photo)) {
      return NextResponse.json({ success: false, requestId, error: "Forbidden" }, { status: 403 });
    }

    const variant: ImageVariant =
      req.nextUrl.searchParams.get("variant") === "thumb" ? "thumb" : "full";

    const object = await getStorageProvider().fetch(photo.originalUrl, variant);

    return new NextResponse(new Uint8Array(object.body), {
      status: 200,
      headers: {
        "Content-Type": object.contentType || photo.mimeType,
        "Content-Length": String(object.body.byteLength),
        "Cache-Control": "private, max-age=300, no-store",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
        "x-request-id": requestId,
      },
    });
  } catch (error) {
    console.error("Photo fetch error:", error);
    return NextResponse.json(
      { success: false, requestId, error: "Unable to load this photo." },
      { status: 500 }
    );
  }
}

type ViewerSession = {
  role?: string | null;
  studentProfileId?: string | null;
  id?: string | null;
};

type PhotoContext = {
  studentId: string;
  activityLog: {
    assignment: {
      teacherId: string | null;
      coordinatorId: string | null;
      supervisor: { userId: string } | null;
    };
  };
};

/**
 * Tenant is already established by the query. This decides *who inside the
 * school* is entitled to the image: the student it belongs to, the staff
 * attached to that assignment, or a role that reviews logs school-wide.
 * A supervisor at another workplace gets nothing.
 */
function canView(user: ViewerSession, photo: PhotoContext): boolean {
  if (user.studentProfileId && user.studentProfileId === photo.studentId) return true;

  const assignment = photo.activityLog.assignment;
  const attachedStaff = [
    assignment.teacherId,
    assignment.coordinatorId,
    assignment.supervisor?.userId ?? null,
  ];
  if (user.id && attachedStaff.includes(user.id)) return true;

  return hasAnyPermission(user.role as never, ["log:review", "immersion:monitor"]);
}
