import { prisma } from "@/lib/prisma";
import { derivePresence, estimateWait, type DerivedPresence } from "./presence";

export interface DirectoryEntry {
  id: string;
  name: string;
  position: string;
  initials: string;
  office: { id: string; name: string; room: string | null } | null;
  floor: { label: string; level: number; name: string | null } | null;
  handles: string[];
  presence: DerivedPresence;
  waiting: number;
  estimatedWaitMinutes: number | null;
}

export interface FloorSummary {
  id: string;
  label: string;
  level: number;
  name: string | null;
  offices: string[];
  available: number;
  busy: number;
  away: number;
  /** Aggregate only. Who opted out is never itemised. */
  hidden: number;
}

/**
 * One place where "which staff may a student see" is decided.
 *
 * There is one college, so there is no tenant to scope by — the only question
 * left is whether the person opted out of being findable.
 *
 * HIDDEN entries are excluded at the query, not filtered in the UI, so a new
 * screen cannot accidentally surface someone who opted out. Guidance in
 * particular needs this: who visits guidance is nobody's business.
 */
const VISIBLE_ONLY = { visibility: "VISIBLE" as const };

export async function searchDirectory(
  opts: { errand?: string; query?: string } = {}
): Promise<DirectoryEntry[]> {
  const query = opts.query?.trim();

  const entries = await prisma.staffDirectoryEntry.findMany({
    where: {
      ...VISIBLE_ONLY,
      ...(opts.errand ? { handles: { has: opts.errand } } : {}),
      ...(query
        ? {
            OR: [
              { user: { firstName: { contains: query, mode: "insensitive" } } },
              { user: { lastName: { contains: query, mode: "insensitive" } } },
              { position: { contains: query, mode: "insensitive" } },
              { office: { name: { contains: query, mode: "insensitive" } } },
              { office: { room: { contains: query, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      position: true,
      handles: true,
      visibility: true,
      presenceStatus: true,
      presenceUntil: true,
      presenceNote: true,
      presenceUpdatedAt: true,
      avgServiceMinutes: true,
      user: { select: { firstName: true, lastName: true } },
      office: {
        select: {
          id: true,
          name: true,
          room: true,
          floor: { select: { label: true, level: true, name: true } },
        },
      },
    },
    orderBy: [{ office: { floor: { level: "asc" } } }, { position: "asc" }],
    take: 100,
  });

  const officeIds = entries.map((e) => e.office?.id).filter((id): id is string => Boolean(id));
  const waitingByOffice = await countWaiting(officeIds);

  return entries.map((e) => {
    const waiting = e.office ? (waitingByOffice.get(e.office.id) ?? 0) : 0;
    return {
      id: e.id,
      name: `${e.user.firstName} ${e.user.lastName}`,
      position: e.position,
      initials: `${e.user.firstName[0] ?? ""}${e.user.lastName[0] ?? ""}`.toUpperCase(),
      office: e.office ? { id: e.office.id, name: e.office.name, room: e.office.room } : null,
      floor: e.office?.floor ?? null,
      handles: e.handles,
      presence: derivePresence(e),
      waiting,
      estimatedWaitMinutes: waiting > 0 ? estimateWait(waiting, e.avgServiceMinutes) : null,
    };
  });
}

/** The cutaway. One row per floor, with who is on it. */
export async function buildFloorStack(): Promise<FloorSummary[]> {
  const floors = await prisma.floor.findMany({
    select: {
      id: true,
      label: true,
      level: true,
      name: true,
      offices: {
        select: {
          name: true,
          staff: {
            select: {
              visibility: true,
              presenceStatus: true,
              presenceUntil: true,
              presenceNote: true,
              presenceUpdatedAt: true,
            },
          },
        },
      },
    },
    orderBy: { level: "desc" },
  });

  return floors.map((floor) => {
    let available = 0;
    let busy = 0;
    let away = 0;
    let hidden = 0;

    for (const office of floor.offices) {
      for (const person of office.staff) {
        if (person.visibility === "HIDDEN") {
          // Counted, never named. The deck shows "7 HIDDEN" as a pill so the
          // stack still adds up without exposing who stepped out of view.
          hidden += 1;
          continue;
        }
        const presence = derivePresence(person);
        if (presence.tone === "available") available += 1;
        else if (presence.tone === "waiting") busy += 1;
        else away += 1;
      }
    }

    return {
      id: floor.id,
      label: floor.label,
      level: floor.level,
      name: floor.name,
      offices: floor.offices.map((o) => o.name),
      available,
      busy,
      away,
      hidden,
    };
  });
}

export async function getStaffMember(id: string) {
  const entry = await prisma.staffDirectoryEntry.findFirst({
    where: { id, ...VISIBLE_ONLY },
    select: {
      id: true,
      position: true,
      handles: true,
      visibility: true,
      presenceStatus: true,
      presenceUntil: true,
      presenceNote: true,
      presenceUpdatedAt: true,
      avgServiceMinutes: true,
      user: { select: { firstName: true, lastName: true } },
      office: {
        select: {
          id: true,
          name: true,
          room: true,
          opensAt: true,
          closesAt: true,
          lunchStart: true,
          lunchEnd: true,
          directions: true,
          floor: { select: { label: true, level: true, name: true } },
        },
      },
    },
  });

  if (!entry) return null;

  const waiting = entry.office
    ? ((await countWaiting([entry.office.id])).get(entry.office.id) ?? 0)
    : 0;

  return {
    id: entry.id,
    name: `${entry.user.firstName} ${entry.user.lastName}`,
    initials: `${entry.user.firstName[0] ?? ""}${entry.user.lastName[0] ?? ""}`.toUpperCase(),
    position: entry.position,
    handles: entry.handles,
    office: entry.office,
    presence: derivePresence(entry),
    waiting,
    avgServiceMinutes: entry.avgServiceMinutes,
    estimatedWaitMinutes: waiting > 0 ? estimateWait(waiting, entry.avgServiceMinutes) : null,
  };
}

async function countWaiting(officeIds: string[]) {
  if (officeIds.length === 0) return new Map<string, number>();

  const grouped = await prisma.queueEntry.groupBy({
    by: ["officeId"],
    where: { officeId: { in: officeIds }, status: "WAITING" },
    _count: { _all: true },
  });

  return new Map(grouped.map((row) => [row.officeId, row._count._all]));
}
