-- Removes the session-side QR code, which allowed attendance to be recorded
-- from anywhere.
--
-- The flow it supported was: an instructor projects a code, students scan it.
-- That code cannot tell the classroom from the canteen — photograph it, send
-- it to somebody at home, and they are marked present. The concept deck named
-- this exact attack; the implementation had it anyway.
--
-- Attendance now travels one way only: the student presents their own code
-- and an instructor scans it, which requires a person in the room.
--
-- Dropping the columns is deliberate. Leaving them would let the route be
-- reinstated without anyone noticing.
--
--   class_sessions.qr_code_token / qr_expires_at  dropped
--   school.check_in_code_ttl_minutes              dropped (governed that code)
--
-- students.qr_code_token is untouched — that is the code being scanned.

-- DropIndex
DROP INDEX "class_sessions_qr_code_token_idx";

-- DropIndex
DROP INDEX "class_sessions_qr_code_token_key";

-- DropIndex
DROP INDEX "student_profiles_qr_code_token_idx";

-- AlterTable
ALTER TABLE "class_sessions" DROP COLUMN "qr_code_token",
DROP COLUMN "qr_expires_at";

-- AlterTable
ALTER TABLE "school" DROP COLUMN "check_in_code_ttl_minutes";

