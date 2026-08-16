import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sectionSchema, paginationSchema } from "@/lib/validation";
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
      search: searchParams.get("search") || undefined,
    });

    const where: any = {};
    if (parsed.search) {
      where.name = { contains: parsed.search, mode: "insensitive" };
    }

    const [sections, total] = await Promise.all([
      prisma.section.findMany({
        where,
        skip: (parsed.page - 1) * parsed.limit,
        take: parsed.limit,
        orderBy: { name: "asc" },
        include: { program: true, academicYear: true, adviser: { select: { id: true, firstName: true, lastName: true } } },
      }),
      prisma.section.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      requestId,
      data: sections,
      pagination: { page: parsed.page, limit: parsed.limit, total, pages: Math.ceil(total / parsed.limit) },
    });
  } catch (error) {
    console.error("List sections error:", error);
    return NextResponse.json({ success: false, requestId, error: "Failed to list sections" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role as any, "section:manage")) {
    return NextResponse.json({ success: false, requestId, error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = sectionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, requestId, error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const section = await prisma.section.create({
      data: { ...parsed.data },
    });

    return NextResponse.json({ success: true, requestId, data: section }, { status: 201 });
  } catch (error) {
    console.error("Create section error:", error);
    return NextResponse.json({ success: false, requestId, error: "Failed to create section" }, { status: 500 });
  }
}
