-- Attendance rules move from hardcoded constants in the check-in routes onto
-- the organization, so a school can set them without a deploy.
--
-- Defaults reproduce the previous hardcoded behaviour exactly: a 15 minute
-- late grace period and a 4 hour (240 minute) check-in code lifetime. Existing
-- rows therefore keep behaving as they did before this migration.

ALTER TABLE "organizations"
  ADD COLUMN "late_grace_minutes" INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN "check_in_code_ttl_minutes" INTEGER NOT NULL DEFAULT 240;
