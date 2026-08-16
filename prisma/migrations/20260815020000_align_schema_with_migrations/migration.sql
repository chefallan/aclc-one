-- Brings the migration chain back in line with schema.prisma.
--
-- The library, notes and class-session features were added to schema.prisma
-- and pushed straight to a development database, so no migration ever
-- described them. `prisma migrate status` reported "up to date" because it
-- only compares the applied migration list, not the actual schema — the drift
-- was invisible until a database was built from the migrations alone.
--
-- Missing here and restored below:
--   - library_categories, library_items, library_borrow_records
--   - note_folders, notes
--   - class_sessions, class_attendances
--   - users.reset_token / users.reset_token_expiry (the password reset flow
--     would have failed at runtime against a correctly migrated database)
--   - added AuditAction and NotificationType enum values
--
-- Generated with `prisma migrate diff`, not hand-written.

-- CreateEnum
CREATE TYPE "LibraryItemType" AS ENUM ('BOOK', 'EBOOK', 'JOURNAL', 'THESIS', 'MODULE', 'HANDOUT', 'VIDEO', 'AUDIO', 'LINK');

-- CreateEnum
CREATE TYPE "LibraryItemStatus" AS ENUM ('AVAILABLE', 'BORROWED', 'RESERVED', 'UNAVAILABLE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "NoteVisibility" AS ENUM ('PRIVATE', 'SHARED', 'PUBLIC');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'REGISTER';
ALTER TYPE "AuditAction" ADD VALUE 'PASSWORD_RESET';
ALTER TYPE "AuditAction" ADD VALUE 'PASSWORD_CHANGE';
ALTER TYPE "AuditAction" ADD VALUE 'LOGIN_FAILED';
ALTER TYPE "AuditAction" ADD VALUE 'ACCOUNT_LOCKED';
ALTER TYPE "AuditAction" ADD VALUE 'SUSPICIOUS_ACTIVITY';
ALTER TYPE "AuditAction" ADD VALUE 'PERMISSION_DENIED';
ALTER TYPE "AuditAction" ADD VALUE 'CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'UPDATE';
ALTER TYPE "AuditAction" ADD VALUE 'DELETE';

-- AlterEnum
BEGIN;
CREATE TYPE "NotificationType_new" AS ENUM ('HOURLY_LOG_REMINDER', 'MISSING_LOG', 'TIME_OUT_REMINDER', 'SUPERVISOR_VERIFICATION_REQUEST', 'TEACHER_REVIEW_REQUEST', 'CORRECTION_REQUEST', 'CLASS_SESSION_STARTED', 'CLASS_SESSION_ENDED', 'ATTENDANCE_MARKED', 'ATTENDANCE_MISSING', 'REPORT_GENERATED');
ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "NotificationType_new" USING ("type"::text::"NotificationType_new");
ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";
ALTER TYPE "NotificationType_new" RENAME TO "NotificationType";
DROP TYPE "public"."NotificationType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "ReportType_new" AS ENUM ('STUDENT_DAILY', 'STUDENT_WEEKLY', 'STUDENT_MONTHLY', 'CLASS_ATTENDANCE', 'ATTENDANCE', 'SECTION_ATTENDANCE', 'PROGRAM_ATTENDANCE', 'SCHOOL_WIDE', 'LIBRARY_USAGE', 'STUDY_BUDDY_MATCHES');
ALTER TABLE "reports" ALTER COLUMN "type" TYPE "ReportType_new" USING ("type"::text::"ReportType_new");
ALTER TYPE "ReportType" RENAME TO "ReportType_old";
ALTER TYPE "ReportType_new" RENAME TO "ReportType";
DROP TYPE "public"."ReportType_old";
COMMIT;

-- AlterTable
ALTER TABLE "student_profiles" ADD COLUMN     "qr_code_token" TEXT,
ADD COLUMN     "rfid_tag" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "reset_token" TEXT,
ADD COLUMN     "reset_token_expiry" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "library_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "icon" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "organization_id" TEXT NOT NULL,

    CONSTRAINT "library_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_items" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "publisher" TEXT,
    "isbn" TEXT,
    "description" TEXT,
    "type" "LibraryItemType" NOT NULL,
    "status" "LibraryItemStatus" NOT NULL DEFAULT 'AVAILABLE',
    "file_url" TEXT,
    "file_size" INTEGER,
    "cover_image" TEXT,
    "external_url" TEXT,
    "tags" TEXT[],
    "year_published" INTEGER,
    "total_copies" INTEGER NOT NULL DEFAULT 1,
    "available_copies" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "category_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,

    CONSTRAINT "library_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_borrow_records" (
    "id" TEXT NOT NULL,
    "borrowed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" TIMESTAMP(3) NOT NULL,
    "returned_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'BORROWED',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "item_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,

    CONSTRAINT "library_borrow_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "note_folders" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#f59e0b',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,

    CONSTRAINT "note_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notes" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "tags" TEXT[],
    "visibility" "NoteVisibility" NOT NULL DEFAULT 'PRIVATE',
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT DEFAULT '#ffffff',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "folder_id" TEXT,
    "organization_id" TEXT NOT NULL,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_sessions" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "room" TEXT,
    "subject" TEXT,
    "qr_code_token" TEXT NOT NULL,
    "qr_expires_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "section_id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,

    CONSTRAINT "class_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_attendances" (
    "id" TEXT NOT NULL,
    "scanned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT NOT NULL DEFAULT 'QR',
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "class_session_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,

    CONSTRAINT "class_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "library_categories_organization_id_idx" ON "library_categories"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "library_categories_organization_id_name_key" ON "library_categories"("organization_id", "name");

-- CreateIndex
CREATE INDEX "library_items_organization_id_idx" ON "library_items"("organization_id");

-- CreateIndex
CREATE INDEX "library_items_category_id_idx" ON "library_items"("category_id");

-- CreateIndex
CREATE INDEX "library_items_status_idx" ON "library_items"("status");

-- CreateIndex
CREATE INDEX "library_items_type_idx" ON "library_items"("type");

-- CreateIndex
CREATE INDEX "library_borrow_records_organization_id_idx" ON "library_borrow_records"("organization_id");

-- CreateIndex
CREATE INDEX "library_borrow_records_item_id_idx" ON "library_borrow_records"("item_id");

-- CreateIndex
CREATE INDEX "library_borrow_records_student_id_idx" ON "library_borrow_records"("student_id");

-- CreateIndex
CREATE INDEX "library_borrow_records_status_idx" ON "library_borrow_records"("status");

-- CreateIndex
CREATE INDEX "note_folders_user_id_idx" ON "note_folders"("user_id");

-- CreateIndex
CREATE INDEX "note_folders_organization_id_idx" ON "note_folders"("organization_id");

-- CreateIndex
CREATE INDEX "notes_user_id_idx" ON "notes"("user_id");

-- CreateIndex
CREATE INDEX "notes_folder_id_idx" ON "notes"("folder_id");

-- CreateIndex
CREATE INDEX "notes_organization_id_idx" ON "notes"("organization_id");

-- CreateIndex
CREATE INDEX "notes_visibility_idx" ON "notes"("visibility");

-- CreateIndex
CREATE UNIQUE INDEX "class_sessions_qr_code_token_key" ON "class_sessions"("qr_code_token");

-- CreateIndex
CREATE INDEX "class_sessions_organization_id_idx" ON "class_sessions"("organization_id");

-- CreateIndex
CREATE INDEX "class_sessions_section_id_idx" ON "class_sessions"("section_id");

-- CreateIndex
CREATE INDEX "class_sessions_teacher_id_idx" ON "class_sessions"("teacher_id");

-- CreateIndex
CREATE INDEX "class_sessions_date_idx" ON "class_sessions"("date");

-- CreateIndex
CREATE INDEX "class_sessions_status_idx" ON "class_sessions"("status");

-- CreateIndex
CREATE INDEX "class_sessions_qr_code_token_idx" ON "class_sessions"("qr_code_token");

-- CreateIndex
CREATE INDEX "class_attendances_organization_id_idx" ON "class_attendances"("organization_id");

-- CreateIndex
CREATE INDEX "class_attendances_class_session_id_idx" ON "class_attendances"("class_session_id");

-- CreateIndex
CREATE INDEX "class_attendances_student_id_idx" ON "class_attendances"("student_id");

-- CreateIndex
CREATE INDEX "class_attendances_scanned_at_idx" ON "class_attendances"("scanned_at");

-- CreateIndex
CREATE UNIQUE INDEX "class_attendances_class_session_id_student_id_key" ON "class_attendances"("class_session_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_qr_code_token_key" ON "student_profiles"("qr_code_token");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_rfid_tag_key" ON "student_profiles"("rfid_tag");

-- CreateIndex
CREATE INDEX "student_profiles_qr_code_token_idx" ON "student_profiles"("qr_code_token");

-- CreateIndex
CREATE UNIQUE INDEX "users_reset_token_key" ON "users"("reset_token");

-- AddForeignKey
ALTER TABLE "library_categories" ADD CONSTRAINT "library_categories_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_items" ADD CONSTRAINT "library_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "library_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_items" ADD CONSTRAINT "library_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_borrow_records" ADD CONSTRAINT "library_borrow_records_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "library_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_borrow_records" ADD CONSTRAINT "library_borrow_records_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_borrow_records" ADD CONSTRAINT "library_borrow_records_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_folders" ADD CONSTRAINT "note_folders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_folders" ADD CONSTRAINT "note_folders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "note_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_attendances" ADD CONSTRAINT "class_attendances_class_session_id_fkey" FOREIGN KEY ("class_session_id") REFERENCES "class_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_attendances" ADD CONSTRAINT "class_attendances_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_attendances" ADD CONSTRAINT "class_attendances_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
