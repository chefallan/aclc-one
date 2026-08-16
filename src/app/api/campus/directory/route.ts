import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { searchDirectory, buildFloorStack } from "@/lib/campus/directory";
import { isErrandKey } from "@/lib/campus/errands";
import { generateRequestId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.role as never, "campus:find_staff")) {
    return NextResponse.json({ success: false, requestId, error: "Forbidden" }, { status: 403 });
  }

  const params = req.nextUrl.searchParams;
  const errandParam = params.get("errand");
  const errand = errandParam && isErrandKey(errandParam) ? errandParam : undefined;

  const [staff, floors] = await Promise.all([
    searchDirectory({
      errand,
      query: params.get("q") ?? undefined,
    }),
    buildFloorStack(),
  ]);

  return NextResponse.json({ success: true, requestId, data: { staff, floors } });
}
