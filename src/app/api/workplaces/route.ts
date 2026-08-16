import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { workplaceSchema, paginationSchema } from "@/lib/validation";
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
      where.OR = [
        { name: { contains: parsed.search, mode: "insensitive" } },
        { industry: { contains: parsed.search, mode: "insensitive" } },
      ];
    }

    const [workplaces, total] = await Promise.all([
      prisma.workplace.findMany({
        where,
        skip: (parsed.page - 1) * parsed.limit,
        take: parsed.limit,
        orderBy: { name: "asc" },
        include: {
          supervisors: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
          _count: { select: { immersionAssignments: true } },
        },
      }),
      prisma.workplace.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      requestId,
      data: workplaces,
      pagination: { page: parsed.page, limit: parsed.limit, total, pages: Math.ceil(total / parsed.limit) },
    });
  } catch (error) {
    console.error("List workplaces error:", error);
    return NextResponse.json({ success: false, requestId, error: "Failed to list workplaces" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role as any, "workplace:manage")) {
    return NextResponse.json({ success: false, requestId, error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = workplaceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, requestId, error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const workplace = await prisma.workplace.create({
      data: { ...parsed.data },
    });

    return NextResponse.json({ success: true, requestId, data: workplace }, { status: 201 });
  } catch (error) {
    console.error("Create workplace error:", error);
    return NextResponse.json({ success: false, requestId, error: "Failed to create workplace" }, { status: 500 });
  }
}
