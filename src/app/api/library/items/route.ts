import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { libraryItemSchema } from "@/lib/validation";
import { generateRequestId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId");
  const search = searchParams.get("search");
  const type = searchParams.get("type");

  const where: Record<string, unknown> = {};
  if (categoryId) where.categoryId = categoryId;
  if (type) where.type = type;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { author: { contains: search, mode: "insensitive" } },
      { tags: { has: search } },
    ];
  }

  const items = await prisma.libraryItem.findMany({
    where,
    include: { category: { select: { name: true, color: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ success: true, requestId, data: items });
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, requestId, error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.role as never, "library:manage")) {
    return NextResponse.json({ success: false, requestId, error: "Forbidden" }, { status: 403 });
  }

  try {
    const parsed = libraryItemSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, requestId, error: parsed.error.issues[0]?.message ?? "Check the form." },
        { status: 400 }
      );
    }

    // categoryId comes from the client, so confirm the category is this
    // school's before attaching an item to it.
    const category = await prisma.libraryCategory.findFirst({
      where: { id: parsed.data.categoryId },
      select: { id: true },
    });
    if (!category) {
      return NextResponse.json(
        { success: false, requestId, error: "That category doesn't exist in your library." },
        { status: 404 }
      );
    }

    const item = await prisma.libraryItem.create({
      data: {
        title: parsed.data.title,
        author: parsed.data.author ?? null,
        publisher: parsed.data.publisher ?? null,
        description: parsed.data.description ?? null,
        type: parsed.data.type,
        categoryId: category.id,
        fileUrl: parsed.data.fileUrl || null,
        externalUrl: parsed.data.externalUrl || null,
        tags: parsed.data.tags,
        yearPublished: parsed.data.yearPublished ?? null,
        totalCopies: parsed.data.totalCopies,
        availableCopies: parsed.data.totalCopies,
      },
      include: { category: { select: { name: true, color: true } } },
    });
    return NextResponse.json({ success: true, requestId, data: item }, { status: 201 });
  } catch (error) {
    console.error("Library item create error:", error);
    return NextResponse.json(
      { success: false, requestId, error: "That item didn't save. Try again." },
      { status: 500 }
    );
  }
}
