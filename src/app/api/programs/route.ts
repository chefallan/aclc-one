import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { programSchema, paginationSchema } from "@/lib/validation";
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
        { code: { contains: parsed.search, mode: "insensitive" } },
      ];
    }

    const [programs, total] = await Promise.all([
      prisma.program.findMany({
        where,
        skip: (parsed.page - 1) * parsed.limit,
        take: parsed.limit,
        orderBy: { name: "asc" },
      }),
      prisma.program.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      requestId,
      data: programs,
      pagination: { page: parsed.page, limit: parsed.limit, total, pages: Math.ceil(total / parsed.limit) },
    });
  } catch (error) {
    console.error("List programs error:", error);
    return NextResponse.json({ success: false, requestId, error: "Failed to list programs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role as any, "program:manage")) {
    return NextResponse.json({ success: false, requestId, error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = programSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, requestId, error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const program = await prisma.program.create({
      data: { ...parsed.data },
    });

    return NextResponse.json({ success: true, requestId, data: program }, { status: 201 });
  } catch (error) {
    console.error("Create program error:", error);
    return NextResponse.json({ success: false, requestId, error: "Failed to create program" }, { status: 500 });
  }
}
