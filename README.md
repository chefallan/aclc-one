# ACLC One

A campus app for **ACLC College of Ormoc**. One school — there is no tenant
model, no organisation switcher, and nothing here is designed to be sold to a
second institution.

## Who can get in

| Role | How they get an account | What they see |
| --- | --- | --- |
| **Admin** | Created directly | Everything. Approves accounts, runs the academic structure, the directory, and section timetables. |
| **Faculty & staff** | Signs up with a faculty ID, then waits for approval | Their classes, attendance, the roster, the library. |
| **Student** | Signs up with a student number, then waits for approval | Their schedule, attendance, library, notes, Study Buddy. |
| **Supervisor** | Created by an admin with a workplace | Only the immersion students attached to them. |

Sign-ups land in a `PENDING` queue and **only an admin can let them in**. Sign-in
refuses a non-active account *after* checking the password, so the form cannot be
used to work out who has an account.

## Running it

You need Node 20+ and Docker.

```bash
cp .env.example .env          # then fill in AUTH_SECRET at minimum
npm install
docker compose up -d db       # Postgres 16; set DB_PORT if 5432 is taken
npx prisma migrate deploy
npm run db:seed               # demo accounts, printed at the end
npm run dev
```

The seed prints every demo login. They all use `password123` and are for
development only.

### Environment

`.env.example` documents all of it. The ones that matter:

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | What the app queries. |
| `DIRECT_URL` | Prisma Migrate only. Same value for local Postgres. |
| `AUTH_SECRET` | 32+ characters. Sessions are JWTs signed with this. |
| `NEXTAUTH_URL` | Must match how you reach the app. |
| `STORAGE_PROVIDER` | `cloudinary`, or `local` for development. Local disk is refused in production — it does not survive a container restart. |
| `AI_PROVIDER` | `ollama` (default) or `openai`. Both speak the OpenAI wire format. |

Docker Compose pins its project name to `aclc-one`, so the database volume does
not depend on what you called the checkout folder.

## Scripts

| Command | |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm test` | Vitest, unit and integration |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Create a migration |
| `npm run db:seed` | Reseed demo data |
| `npm run db:studio` | Prisma Studio — browse the database |

## What is in it

**Attendance.** An instructor opens a class session and scans student codes.
Students deliberately cannot scan: a code photographed off the board and sent to
a friend at home is exactly how remote check-in happens, so the ability to
submit one belongs only to the person standing in the room.

**Schedules.** The registrar keeps a block timetable per section. Students in
that section follow it by default, so a moved class reaches everyone without
anyone re-entering anything, and can switch to a personal timetable — optionally
starting from a copy of their section's. Week grid and month calendar, both
bounded by the academic year.

**Campus.** Staff finder, floor stack, and presence derived from recent activity
with a staleness cutoff. Staff marked hidden are counted but never named.

**Study Buddy.** A chat assistant grounded in the student's own notes and
uploaded material, over an OpenAI-compatible endpoint.

Plus the library, notes, work-immersion placements, activity logs and reporting.

## Testing

```bash
npm test
```

Pure logic is unit-tested; route handlers are integration-tested against a
mocked Prisma. Security and ownership guards are **mutation-tested** — each one
has been removed and the suite shown to fail — so a green run means the guards
are doing work rather than that they merely exist.

## Not built yet

Being explicit so nobody plans around them:

- `AttendanceRecord` is in the schema but nothing writes to it. Class attendance
  goes through `ClassAttendance`.
- Supervisor verification and teacher review have models but no endpoints.
- Offline capture and sync do not exist, despite the feature flag.
- Playwright is installed; there are no end-to-end specs.
- A student's QR code is static. Rotating it, or showing the student's photo on
  scan, is the fix if code-sharing becomes a problem in practice.
