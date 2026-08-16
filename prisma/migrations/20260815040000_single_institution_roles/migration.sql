-- ACLC One serves one college, not many tenants, so the role tiers collapse
-- into school roles and accounts gain an approval state.
--
-- Role mapping, chosen so nobody loses access they already had:
--   SUPER_ADMIN, ORG_ADMIN, COORDINATOR  ->  ADMIN
--   TEACHER                              ->  FACULTY
--   SUPERVISOR, STUDENT                  ->  unchanged
--
-- Status mapping:
--   PENDING_VERIFICATION -> PENDING   (they were never verified, and now need
--                                      an administrator rather than an email)
--   everything else      -> unchanged
--
-- Postgres will not drop an enum value in use, so both enums are rebuilt and
-- swapped rather than altered in place.

-- ── UserRole ────────────────────────────────────────────────────────────────
CREATE TYPE "UserRole_new" AS ENUM ('ADMIN', 'FACULTY', 'STUDENT', 'SUPERVISOR');

ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole_new"
  USING (
    CASE "role"::text
      WHEN 'SUPER_ADMIN' THEN 'ADMIN'
      WHEN 'ORG_ADMIN'   THEN 'ADMIN'
      WHEN 'COORDINATOR' THEN 'ADMIN'
      WHEN 'TEACHER'     THEN 'FACULTY'
      WHEN 'SUPERVISOR'  THEN 'SUPERVISOR'
      ELSE 'STUDENT'
    END
  )::"UserRole_new";

DROP TYPE "UserRole";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";

-- ── UserStatus ──────────────────────────────────────────────────────────────
CREATE TYPE "UserStatus_new" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'INACTIVE', 'SUSPENDED');

-- UserStatus is shared by three tables, so every column has to move across
-- before the old type can be dropped. student_profiles and
-- workplace_supervisors are school records rather than accounts: they were
-- never "pending" in the approval sense, so an unrecognised value there
-- becomes ACTIVE rather than PENDING.
ALTER TABLE "users" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "student_profiles" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "workplace_supervisors" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "users" ALTER COLUMN "status" TYPE "UserStatus_new"
  USING (
    CASE "status"::text
      WHEN 'PENDING_VERIFICATION' THEN 'PENDING'
      WHEN 'ACTIVE'    THEN 'ACTIVE'
      WHEN 'INACTIVE'  THEN 'INACTIVE'
      WHEN 'SUSPENDED' THEN 'SUSPENDED'
      ELSE 'PENDING'
    END
  )::"UserStatus_new";

ALTER TABLE "student_profiles" ALTER COLUMN "status" TYPE "UserStatus_new"
  USING (
    CASE "status"::text
      WHEN 'INACTIVE'  THEN 'INACTIVE'
      WHEN 'SUSPENDED' THEN 'SUSPENDED'
      ELSE 'ACTIVE'
    END
  )::"UserStatus_new";

ALTER TABLE "workplace_supervisors" ALTER COLUMN "status" TYPE "UserStatus_new"
  USING (
    CASE "status"::text
      WHEN 'INACTIVE'  THEN 'INACTIVE'
      WHEN 'SUSPENDED' THEN 'SUSPENDED'
      ELSE 'ACTIVE'
    END
  )::"UserStatus_new";

DROP TYPE "UserStatus";
ALTER TYPE "UserStatus_new" RENAME TO "UserStatus";

ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'PENDING';
ALTER TABLE "student_profiles" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
ALTER TABLE "workplace_supervisors" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- ── Sign-up and approval trail ──────────────────────────────────────────────
ALTER TABLE "users"
  ADD COLUMN "id_number" TEXT,
  ADD COLUMN "approved_at" TIMESTAMP(3),
  ADD COLUMN "approved_by_id" TEXT,
  ADD COLUMN "rejection_reason" TEXT;

-- users_status_idx already exists: the User model has carried @@index([status])
-- since the init migration, so creating it here would fail on a clean build.
