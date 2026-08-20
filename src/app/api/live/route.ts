import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

/**
 * A cheap "has anything changed?" stamp, for pages that should not go stale
 * while someone is looking at them.
 *
 * The alternative designs both cost more than they are worth here. Refetching
 * the page on a timer moves real payload for nothing most of the time, and a
 * held-open SSE connection on Vercel is a function invocation that never ends.
 * This returns a few dozen bytes: a count and the newest updatedAt for the
 * rows the caller is actually looking at. The client compares it to what it
 * saw last and only asks the server for the page when the two differ.
 *
 * Every scope is checked against the session. A stamp leaks the existence and
 * rough activity of records, so it is not public just because it is small.
 */
export const dynamic = "force-dynamic";

type Stamp = { count: number; latest: Date | null };

function encode(s: Stamp): string {
  return `${s.count}:${s.latest ? s.latest.getTime() : 0}`;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scope = req.nextUrl.searchParams.get("scope") ?? "";
  const id = req.nextUrl.searchParams.get("id") ?? undefined;
  const role = session.user.role as never;

  try {
    let stamp: Stamp;

    switch (scope) {
      // One section's block timetable - the registrar's editor, and every
      // student following it.
      case "section-schedule": {
        if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
        const [count, latest] = await Promise.all([
          prisma.sectionScheduleEntry.count({ where: { sectionId: id } }),
          prisma.sectionScheduleEntry.findFirst({
            where: { sectionId: id },
            orderBy: { updatedAt: "desc" },
            select: { updatedAt: true },
          }),
        ]);
        stamp = { count, latest: latest?.updatedAt ?? null };
        break;
      }

      // Whatever timetable the signed-in person reads. Covers both their own
      // entries and the section block, because either can change underneath
      // them - and switching between the two changes the profile row.
      case "my-schedule": {
        const student = await prisma.studentProfile.findFirst({
          where: { userId: session.user.id },
          select: {
            updatedAt: true,
            enrollments: {
              where: { enrollmentStatus: "ENROLLED" },
              orderBy: { enrolledAt: "desc" },
              take: 1,
              select: { sectionId: true },
            },
          },
        });

        const sectionId = student?.enrollments[0]?.sectionId;
        const [own, ownLatest, sectionCount, sectionLatest] = await Promise.all([
          prisma.scheduleEntry.count({ where: { userId: session.user.id } }),
          prisma.scheduleEntry.findFirst({
            where: { userId: session.user.id },
            orderBy: { updatedAt: "desc" },
            select: { updatedAt: true },
          }),
          sectionId ? prisma.sectionScheduleEntry.count({ where: { sectionId } }) : 0,
          sectionId
            ? prisma.sectionScheduleEntry.findFirst({
                where: { sectionId },
                orderBy: { updatedAt: "desc" },
                select: { updatedAt: true },
              })
            : null,
        ]);

        const times = [ownLatest?.updatedAt, sectionLatest?.updatedAt, student?.updatedAt]
          .filter(Boolean) as Date[];
        stamp = {
          count: own + sectionCount,
          latest: times.length ? new Date(Math.max(...times.map((d) => d.getTime()))) : null,
        };
        break;
      }

      // The approval queue, so an admin sitting on it sees new requests.
      case "accounts": {
        if (!hasPermission(role, "account:approve")) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const [count, latest] = await Promise.all([
          prisma.user.count({ where: { status: "PENDING", role: { in: ["STUDENT", "FACULTY"] } } }),
          prisma.user.findFirst({
            where: { status: "PENDING", role: { in: ["STUDENT", "FACULTY"] } },
            orderBy: { updatedAt: "desc" },
            select: { updatedAt: true },
          }),
        ]);
        stamp = { count, latest: latest?.updatedAt ?? null };
        break;
      }

      case "sections": {
        if (!hasPermission(role, "schedule:manage_section")) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const [count, latest] = await Promise.all([
          prisma.section.count(),
          prisma.section.findFirst({ orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
        ]);
        stamp = { count, latest: latest?.updatedAt ?? null };
        break;
      }

      default:
        return NextResponse.json({ error: "Unknown scope" }, { status: 400 });
    }

    return NextResponse.json(
      { stamp: encode(stamp) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Live stamp error:", error);
    // A failed poll must not look like a change, or the page reloads in a loop.
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }
}
