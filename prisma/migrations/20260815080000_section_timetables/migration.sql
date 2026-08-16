-- CreateEnum
CREATE TYPE "ScheduleSource" AS ENUM ('SECTION', 'PERSONAL');

-- AlterTable
ALTER TABLE "student_profiles" ADD COLUMN     "schedule_source" "ScheduleSource" NOT NULL DEFAULT 'SECTION';

-- CreateTable
CREATE TABLE "section_schedule_entries" (
    "id" TEXT NOT NULL,
    "subject_code" TEXT NOT NULL,
    "subject_title" TEXT,
    "day" "Weekday" NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "room" TEXT,
    "instructor" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "section_id" TEXT NOT NULL,

    CONSTRAINT "section_schedule_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "section_schedule_entries_section_id_day_idx" ON "section_schedule_entries"("section_id", "day");

-- AddForeignKey
ALTER TABLE "section_schedule_entries" ADD CONSTRAINT "section_schedule_entries_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

