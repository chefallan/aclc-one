import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { academicYearSchema, paginationSchema } from "@/lib/validation";
import { hasPermission } from "@/lib/permissions";
import { generateRequestId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const parsed = paginationSchema.parse({
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "20",
    });

    const where = {};

    const [years, total] = await Promise.all([
      prisma.academicYear.findMany({
        where,
        skip: (parsed.page - 1) * parsed.limit,
        take: parsed.limit,
        orderBy: { startDate: "desc" },
      }),
      prisma.academicYear.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      requestId,
      data: years,
      pagination: { page: parsed.page, limit: parsed.limit, total, pages: Math.ceil(total / parsed.limit) },
    });
  } catch (error) {
    console.error("List academic years error:", error);
    return NextResponse.json({ success: false, requestId, error: "Failed to list academic years" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role as any, "academic_year:manage")) {
    return NextResponse.json({ success: false, requestId, error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = academicYearSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, requestId, error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const year = await prisma.academicYear.create({
      data: { ...parsed.data },
    });

    return NextResponse.json({ success: true, requestId, data: year }, { status: 201 });
  } catch (error) {
    console.error("Create academic year error:", error);
    return NextResponse.json({ success: false, requestId, error: "Failed to create academic year" }, { status: 500 });
  }
}
