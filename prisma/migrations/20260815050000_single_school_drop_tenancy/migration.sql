-- ACLC One serves one college, so multi-tenancy comes out.
--
-- What this does, and why each part is irreversible:
--   * Drops organization_id from every table. Row ownership is now implied:
--     there is one school, so everything belongs to it.
--   * Renames organizations -> school. It holds the school profile and the
--     attendance rules, and is expected to contain exactly one row.
--   * Drops plans, subscriptions, subscription_events and invoices. Billing
--     existed to charge other schools; there are none.
--
-- Composite uniques lose their tenant column, which makes them stricter: a
-- student number and a section name are now unique outright rather than
-- unique per school. That is correct here, but it will fail to apply if the
-- database already holds duplicates across the old tenants.
--
-- Take a backup before running this anywhere you care about.

-- DropForeignKey
ALTER TABLE "academic_years" DROP CONSTRAINT "academic_years_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "activity_logs" DROP CONSTRAINT "activity_logs_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "ai_summaries" DROP CONSTRAINT "ai_summaries_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "attendance_records" DROP CONSTRAINT "attendance_records_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "chat_messages" DROP CONSTRAINT "chat_messages_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "class_attendances" DROP CONSTRAINT "class_attendances_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "class_sessions" DROP CONSTRAINT "class_sessions_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "floors" DROP CONSTRAINT "floors_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "immersion_assignments" DROP CONSTRAINT "immersion_assignments_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "immersion_programs" DROP CONSTRAINT "immersion_programs_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_subscription_id_fkey";

-- DropForeignKey
ALTER TABLE "library_borrow_records" DROP CONSTRAINT "library_borrow_records_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "library_categories" DROP CONSTRAINT "library_categories_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "library_items" DROP CONSTRAINT "library_items_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "note_folders" DROP CONSTRAINT "note_folders_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "notes" DROP CONSTRAINT "notes_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "offices" DROP CONSTRAINT "offices_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "photo_evidence" DROP CONSTRAINT "photo_evidence_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "programs" DROP CONSTRAINT "programs_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "queue_entries" DROP CONSTRAINT "queue_entries_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "reports" DROP CONSTRAINT "reports_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "sections" DROP CONSTRAINT "sections_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "staff_directory_entries" DROP CONSTRAINT "staff_directory_entries_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "student_enrollments" DROP CONSTRAINT "student_enrollments_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "student_profiles" DROP CONSTRAINT "student_profiles_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "subscription_events" DROP CONSTRAINT "subscription_events_subscription_id_fkey";

-- DropForeignKey
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_plan_id_fkey";

-- DropForeignKey
ALTER TABLE "supervisor_verifications" DROP CONSTRAINT "supervisor_verifications_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "teacher_reviews" DROP CONSTRAINT "teacher_reviews_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "work_sessions" DROP CONSTRAINT "work_sessions_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "workplace_supervisors" DROP CONSTRAINT "workplace_supervisors_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "workplaces" DROP CONSTRAINT "workplaces_organization_id_fkey";

-- DropIndex
DROP INDEX "academic_years_organization_id_idx";

-- DropIndex
DROP INDEX "academic_years_organization_id_name_key";

-- DropIndex
DROP INDEX "activity_logs_organization_id_idx";

-- DropIndex
DROP INDEX "ai_summaries_organization_id_idx";

-- DropIndex
DROP INDEX "attendance_records_organization_id_idx";

-- DropIndex
DROP INDEX "audit_logs_organization_id_idx";

-- DropIndex
DROP INDEX "chat_messages_organization_id_idx";

-- DropIndex
DROP INDEX "class_attendances_organization_id_idx";

-- DropIndex
DROP INDEX "class_sessions_organization_id_idx";

-- DropIndex
DROP INDEX "conversations_organization_id_idx";

-- DropIndex
DROP INDEX "floors_organization_id_idx";

-- DropIndex
DROP INDEX "floors_organization_id_level_key";

-- DropIndex
DROP INDEX "immersion_assignments_organization_id_idx";

-- DropIndex
DROP INDEX "immersion_programs_organization_id_idx";

-- DropIndex
DROP INDEX "library_borrow_records_organization_id_idx";

-- DropIndex
DROP INDEX "library_categories_organization_id_idx";

-- DropIndex
DROP INDEX "library_categories_organization_id_name_key";

-- DropIndex
DROP INDEX "library_items_organization_id_idx";

-- DropIndex
DROP INDEX "note_folders_organization_id_idx";

-- DropIndex
DROP INDEX "notes_organization_id_idx";

-- DropIndex
DROP INDEX "notifications_organization_id_idx";

-- DropIndex
DROP INDEX "offices_organization_id_idx";

-- DropIndex
DROP INDEX "photo_evidence_organization_id_idx";

-- DropIndex
DROP INDEX "programs_organization_id_code_key";

-- DropIndex
DROP INDEX "programs_organization_id_idx";

-- DropIndex
DROP INDEX "queue_entries_organization_id_idx";

-- DropIndex
DROP INDEX "reports_organization_id_idx";

-- DropIndex
DROP INDEX "sections_organization_id_academic_year_id_program_id_name_key";

-- DropIndex
DROP INDEX "sections_organization_id_idx";

-- DropIndex
DROP INDEX "staff_directory_entries_organization_id_idx";

-- DropIndex
DROP INDEX "student_enrollments_organization_id_idx";

-- DropIndex
DROP INDEX "student_profiles_organization_id_idx";

-- DropIndex
DROP INDEX "student_profiles_organization_id_student_number_key";

-- DropIndex
DROP INDEX "supervisor_verifications_organization_id_idx";

-- DropIndex
DROP INDEX "teacher_reviews_organization_id_idx";

-- DropIndex
DROP INDEX "users_organization_id_idx";

-- DropIndex
DROP INDEX "work_sessions_organization_id_idx";

-- DropIndex
DROP INDEX "workplace_supervisors_organization_id_idx";

-- DropIndex
DROP INDEX "workplaces_organization_id_idx";

-- AlterTable
ALTER TABLE "academic_years" DROP COLUMN "organization_id";

-- AlterTable
ALTER TABLE "activity_logs" DROP COLUMN "organization_id";

-- AlterTable
ALTER TABLE "ai_summaries" DROP COLUMN "organization_id";

-- AlterTable
ALTER TABLE "attendance_records" DROP COLUMN "organization_id";

-- AlterTable
ALTER TABLE "audit_logs" DROP COLUMN "organization_id";

-- AlterTable
ALTER TABLE "chat_messages" DROP COLUMN "organization_id";

-- AlterTable
ALTER TABLE "class_attendances" DROP COLUMN "organization_id";

-- AlterTable
ALTER TABLE "class_sessions" DROP COLUMN "organization_id";

-- AlterTable
ALTER TABLE "conversations" DROP COLUMN "organization_id";

-- AlterTable
ALTER TABLE "floors" DROP COLUMN "organization_id";

-- AlterTable
ALTER TABLE "immersion_assignments" DROP COLUMN "organization_id";

-- AlterTable
ALTER TABLE "immersion_programs" DROP COLUMN "organization_id";

-- AlterTable
ALTER TABLE "library_borrow_records" DROP COLUMN "organization_id";

-- AlterTable
ALTER TABLE "library_categories" DROP COLUMN "organization_id";

-- AlterTable
ALTER TABLE "library_items" DROP COLUMN "organization_id";

-- AlterTable
ALTER TABLE "note_folders" DROP COLUMN "organization_id";

-- AlterTable
ALTER TABLE "notes" DROP COLUMN "organization_id";

-- AlterTable
ALTER TABLE "notifications" DROP COLUMN "organization_id";

-- AlterTable
ALTER TABLE "offices" DROP COLUMN "organization_id";

-- AlterTable
ALTER TABLE "photo_evidence" DROP COLUMN "organization_id";

-- AlterTable
ALTER TABLE "programs" DROP COLUMN "organization_id";

-- AlterTable
ALTER TABLE "queue_entries" DROP COLUMN "organization_id";

-- AlterTable
ALTER TABLE "reports" DROP COLUMN "organization_id";

-- AlterTable
ALTER TABLE "sections" DROP COLUMN "organization_id";

-- AlterTable
ALTER TABLE "staff_directory_entries" DROP COLUMN "organization_id";

-- AlterTable
ALTER TABLE "student_enrollments" DROP COLUMN "organization_id";

-- AlterTable
ALTER TABLE "student_profiles" DROP COLUMN "organization_id";

-- AlterTable
ALTER TABLE "supervisor_verifications" DROP COLUMN "organization_id";

-- AlterTable
ALTER TABLE "teacher_reviews" DROP COLUMN "organization_id";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "organization_id";

-- AlterTable
ALTER TABLE "work_sessions" DROP COLUMN "organization_id";

-- AlterTable
ALTER TABLE "workplace_supervisors" DROP COLUMN "organization_id";

-- AlterTable
ALTER TABLE "workplaces" DROP COLUMN "organization_id";

-- DropTable
DROP TABLE "invoices";

-- DropTable
DROP TABLE "organizations";

-- DropTable
DROP TABLE "plans";

-- DropTable
DROP TABLE "subscription_events";

-- DropTable
DROP TABLE "subscriptions";

-- DropEnum
DROP TYPE "OrganizationStatus";

-- DropEnum
DROP TYPE "OrganizationType";

-- DropEnum
DROP TYPE "PlanTier";

-- DropEnum
DROP TYPE "SubscriptionStatus";

-- CreateTable
CREATE TABLE "school" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legal_name" TEXT,
    "logo" TEXT,
    "address" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "late_grace_minutes" INTEGER NOT NULL DEFAULT 15,
    "check_in_code_ttl_minutes" INTEGER NOT NULL DEFAULT 240,

    CONSTRAINT "school_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "academic_years_name_key" ON "academic_years"("name");

-- CreateIndex
CREATE UNIQUE INDEX "floors_level_key" ON "floors"("level");

-- CreateIndex
CREATE UNIQUE INDEX "library_categories_name_key" ON "library_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "programs_code_key" ON "programs"("code");

-- CreateIndex
CREATE UNIQUE INDEX "sections_academic_year_id_program_id_name_key" ON "sections"("academic_year_id", "program_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_student_number_key" ON "student_profiles"("student_number");

