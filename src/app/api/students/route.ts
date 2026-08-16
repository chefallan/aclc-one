import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { studentProfileSchema, paginationSchema } from "@/lib/validation";
import { hasPermission } from "@/lib/permissions";
import { generateRequestId } from "@/lib/utils";
import bcrypt from "bcryptjs";

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
        { firstName: { contains: parsed.search, mode: "insensitive" } },
        { lastName: { contains: parsed.search, mode: "insensitive" } },
        { studentNumber: { contains: parsed.search, mode: "insensitive" } },
      ];
    }

    const [students, total] = await Promise.all([
      prisma.studentProfile.findMany({
        where,
        skip: (parsed.page - 1) * parsed.limit,
        take: parsed.limit,
        orderBy: { lastName: "asc" },
        include: {
          user: { select: { email: true, status: true } },
          enrollments: {
            include: { academicYear: true, program: true, section: true },
            orderBy: { enrolledAt: "desc" },
            take: 1,
          },
        },
      }),
      prisma.studentProfile.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      requestId,
      data: students,
      pagination: { page: parsed.page, limit: parsed.limit, total, pages: Math.ceil(total / parsed.limit) },
    });
  } catch (error) {
    console.error("List students error:", error);
    return NextResponse.json({ success: false, requestId, error: "Failed to list students" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role as any, "student:manage")) {
    return NextResponse.json({ success: false, requestId, error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = studentProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, requestId, error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const tempPassword = Math.random().toString(36).slice(2, 10);
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.contactEmail || `${data.studentNumber}@immerse.local`,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          middleName: data.middleName,
          role: "STUDENT",
          status: "ACTIVE",
        },
      });

      const profile = await tx.studentProfile.create({
        data: {
          ...data,
          userId: user.id,
        },
      });

      return { user, profile, tempPassword };
    });

    return NextResponse.json(
      { success: true, requestId, data: { profile: result.profile, tempPassword: result.tempPassword } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create student error:", error);
    return NextResponse.json({ success: false, requestId, error: "Failed to create student" }, { status: 500 });
  }
}
