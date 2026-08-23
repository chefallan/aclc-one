import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * The sections a student can pick from while signing up.
 *
 * Unauthenticated by necessity - the person asking has no account yet. So it
 * returns the least that makes the dropdown work: the name a student would
 * recognise from their enrolment slip, and nothing about who is in it. No
 * counts, no advisers, no timetable. Archived sections are left out, or
 * someone signs up into a section that is no longer running.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sections = await prisma.section.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        yearLevel: true,
        program: { select: { code: true } },
      },
      orderBy: [{ yearLevel: "asc" }, { name: "asc" }],
      // A school has tens of sections, not thousands. A cap keeps an
      // unauthenticated endpoint from ever being a cheap way to make the
      // database work hard.
      take: 200,
    });

    return NextResponse.json({
      success: true,
      data: sections.map((s) => ({
        id: s.id,
        name: s.name,
        yearLevel: s.yearLevel,
        programCode: s.program.code,
      })),
    });
  } catch (error) {
    console.error("Public sections error:", error);
    // The form treats an empty list as "no sections to choose from", which is
    // the right behaviour when the school has not set any up yet either.
    return NextResponse.json({ success: true, data: [] });
  }
}
