-- The staff finder and floor stack.
--
-- Presence is derived from a person'''s own toggle and expires to UNKNOWN when
-- stale. Nothing here stores a location history or a continuous position, and
-- StaffVisibility.HIDDEN removes a person from every student-facing query.

-- CreateEnum
CREATE TYPE "PresenceStatus" AS ENUM ('AT_DESK', 'STEPPED_OUT', 'LUNCH', 'IN_MEETING', 'IN_CLASS', 'OFF_CAMPUS', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "StaffVisibility" AS ENUM ('VISIBLE', 'HIDDEN');

-- CreateEnum
CREATE TYPE "QueueStatus" AS ENUM ('WAITING', 'SERVING', 'SERVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "floors" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "name" TEXT,
    "level" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "organization_id" TEXT NOT NULL,

    CONSTRAINT "floors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offices" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "room" TEXT,
    "opens_at" TEXT,
    "closes_at" TEXT,
    "lunch_start" TEXT,
    "lunch_end" TEXT,
    "directions" TEXT,
    "handles" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "floor_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,

    CONSTRAINT "offices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_directory_entries" (
    "id" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "handles" TEXT[],
    "visibility" "StaffVisibility" NOT NULL DEFAULT 'VISIBLE',
    "presence_status" "PresenceStatus" NOT NULL DEFAULT 'UNKNOWN',
    "presence_until" TIMESTAMP(3),
    "presence_note" TEXT,
    "presence_updated_at" TIMESTAMP(3),
    "avg_service_minutes" INTEGER NOT NULL DEFAULT 10,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "office_id" TEXT,
    "organization_id" TEXT NOT NULL,

    CONSTRAINT "staff_directory_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queue_entries" (
    "id" TEXT NOT NULL,
    "errand" TEXT NOT NULL,
    "status" "QueueStatus" NOT NULL DEFAULT 'WAITING',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "served_at" TIMESTAMP(3),
    "office_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,

    CONSTRAINT "queue_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "floors_organization_id_idx" ON "floors"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "floors_organization_id_level_key" ON "floors"("organization_id", "level");

-- CreateIndex
CREATE INDEX "offices_organization_id_idx" ON "offices"("organization_id");

-- CreateIndex
CREATE INDEX "offices_floor_id_idx" ON "offices"("floor_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_directory_entries_user_id_key" ON "staff_directory_entries"("user_id");

-- CreateIndex
CREATE INDEX "staff_directory_entries_organization_id_idx" ON "staff_directory_entries"("organization_id");

-- CreateIndex
CREATE INDEX "staff_directory_entries_office_id_idx" ON "staff_directory_entries"("office_id");

-- CreateIndex
CREATE INDEX "staff_directory_entries_visibility_idx" ON "staff_directory_entries"("visibility");

-- CreateIndex
CREATE INDEX "queue_entries_organization_id_idx" ON "queue_entries"("organization_id");

-- CreateIndex
CREATE INDEX "queue_entries_office_id_status_idx" ON "queue_entries"("office_id", "status");

-- CreateIndex
CREATE INDEX "queue_entries_student_id_idx" ON "queue_entries"("student_id");

-- AddForeignKey
ALTER TABLE "floors" ADD CONSTRAINT "floors_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offices" ADD CONSTRAINT "offices_floor_id_fkey" FOREIGN KEY ("floor_id") REFERENCES "floors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offices" ADD CONSTRAINT "offices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_directory_entries" ADD CONSTRAINT "staff_directory_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_directory_entries" ADD CONSTRAINT "staff_directory_entries_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "offices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_directory_entries" ADD CONSTRAINT "staff_directory_entries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

