-- The section a student picks while signing up.
--
-- Nullable, and deliberately not an enrolment: it is what the applicant asked
-- for while their account is still PENDING. Approval turns it into a real
-- StudentEnrollment. Faculty leave it null.
--
-- ON DELETE SET NULL rather than CASCADE: deleting a section must not delete
-- the people who once asked to join it.
ALTER TABLE "users" ADD COLUMN "requested_section_id" TEXT;

ALTER TABLE "users"
  ADD CONSTRAINT "users_requested_section_id_fkey"
  FOREIGN KEY ("requested_section_id") REFERENCES "sections"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
