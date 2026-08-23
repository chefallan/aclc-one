-- Subjects and grades.
--
-- Timetables carry a subject code as free text, which prints fine and cannot
-- hold a grade or a unit count. Subject is that missing record; Grade is one
-- mark per student per subject per period.
--
-- The two things schools disagree about - the scale, and the pass mark - are
-- settings rather than assumptions baked into the column types.

CREATE TYPE "GradingScale" AS ENUM ('PERCENTAGE', 'POINT_SCALE');
CREATE TYPE "GradingPeriod" AS ENUM ('PRELIM', 'MIDTERM', 'SEMIFINAL', 'FINAL');
CREATE TYPE "GradeStatus" AS ENUM ('DRAFT', 'POSTED');

ALTER TABLE "school"
  ADD COLUMN "grading_scale" "GradingScale" NOT NULL DEFAULT 'PERCENTAGE',
  ADD COLUMN "passing_grade" DECIMAL(5,2) NOT NULL DEFAULT 75;

CREATE TABLE "subjects" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "units" DECIMAL(4,2) NOT NULL DEFAULT 3,
    "description" TEXT,
    "status" "ProgramStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "program_id" TEXT,
    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subjects_code_key" ON "subjects"("code");
CREATE INDEX "subjects_program_id_idx" ON "subjects"("program_id");

CREATE TABLE "grades" (
    "id" TEXT NOT NULL,
    "period" "GradingPeriod" NOT NULL,
    -- Nullable: a blank cell on the sheet is not a zero.
    "score" DECIMAL(5,2),
    "status" "GradeStatus" NOT NULL DEFAULT 'DRAFT',
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "student_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "academic_year_id" TEXT NOT NULL,
    "section_id" TEXT,
    "recorded_by_id" TEXT,
    CONSTRAINT "grades_pkey" PRIMARY KEY ("id")
);

-- One mark per student, per subject, per year, per period. This is what stops
-- a double entry from silently becoming two conflicting grades.
CREATE UNIQUE INDEX "grades_student_id_subject_id_academic_year_id_period_key"
  ON "grades"("student_id", "subject_id", "academic_year_id", "period");
CREATE INDEX "grades_section_id_subject_id_idx" ON "grades"("section_id", "subject_id");
CREATE INDEX "grades_student_id_academic_year_id_idx" ON "grades"("student_id", "academic_year_id");

ALTER TABLE "subjects" ADD CONSTRAINT "subjects_program_id_fkey"
  FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "grades" ADD CONSTRAINT "grades_student_id_fkey"
  FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "grades" ADD CONSTRAINT "grades_subject_id_fkey"
  FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "grades" ADD CONSTRAINT "grades_academic_year_id_fkey"
  FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "grades" ADD CONSTRAINT "grades_section_id_fkey"
  FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "grades" ADD CONSTRAINT "grades_recorded_by_id_fkey"
  FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
