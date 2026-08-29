-- WADT-1C — section + official block timetable
--
-- Transcribed from the printed registrar sheet. The sheet is headed "BSCS-1A"
-- but the block it describes is WADT-1C, so that is where it is loaded.
--
-- Times on that sheet are 12-hour with no AM/PM marker; everything from "1:00"
-- down is afternoon, so it is stored here as 24-hour "HH:mm" to match
-- section_schedule_entries.
--
-- Safe to re-run. The academic year and section are inserted only if absent;
-- the timetable is rebuilt from scratch each time (see the DELETE below, which
-- is scoped to this one section).
--
-- Edit these two literals if your data uses different names:
--   academic year : '2026-2027'
--   program code  : 'WADT'
--
-- Run with:  psql "$DATABASE_URL" -f prisma/sql/seed-wadt-1c.sql

BEGIN;

-- ─── Programme ───────────────────────────────────────────────────────────────
-- The name is corrected on an existing row: prisma/seed.ts writes "Web & App
-- Development Technology", which is not what the programme is called.

INSERT INTO programs (id, code, name, status, created_at, updated_at)
VALUES ('prog_wadt', 'WADT', 'Web Application Development Technology', 'ACTIVE', NOW(), NOW())
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      updated_at = NOW();

-- ─── Academic year ───────────────────────────────────────────────────────────

INSERT INTO academic_years (id, name, start_date, end_date, status, created_at, updated_at)
VALUES ('ay_2026_2027', '2026-2027', DATE '2026-06-01', DATE '2027-03-31', 'ACTIVE', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- ─── Section ─────────────────────────────────────────────────────────────────

INSERT INTO sections (id, name, year_level, status, academic_year_id, program_id, adviser_id, created_at, updated_at)
SELECT 'sec_wadt_1c', 'WADT-1C', 1, 'ACTIVE', ay.id, p.id, NULL, NOW(), NOW()
FROM academic_years ay
CROSS JOIN programs p
WHERE ay.name = '2026-2027'
  AND p.code = 'WADT'
ON CONFLICT (academic_year_id, program_id, name) DO NOTHING;

-- ─── Subjects ────────────────────────────────────────────────────────────────
-- The timetable itself carries subject codes as free text and does not need
-- these rows. Grades do — a mark has to hang off a subject.
--
-- program_id is NULL for the general education subjects, which belong to no
-- single programme, and set for the three that are WADT's own. Units are the
-- usual Philippine load and are the one thing here not taken from the sheet;
-- check them against the curriculum before grades are encoded.

INSERT INTO subjects (id, code, title, units, status, program_id, created_at, updated_at)
SELECT
  'subj_' || lower(v.code),
  v.code,
  v.title,
  v.units,
  'ACTIVE',
  CASE WHEN v.owned_by_program THEN p.id ELSE NULL END,
  NOW(),
  NOW()
FROM (VALUES
  ('GE6114',    'Mathematics in the Modern World',      3.0, false),
  ('GE6106',    'Purposive Communication 1',            3.0, false),
  ('MATH6316',  'Linear Algebra',                       3.0, true),
  ('ITE6101',   'Computer Fundamentals',                3.0, true),
  ('NSTP6101',  'National Service Training Program 1',  3.0, false),
  ('ETHNS6101', 'Euthenics 1',                          1.0, false),
  ('PHYED6104', 'PATHFIT 1',                            2.0, false),
  ('GE6100',    'Understanding the Self',               3.0, false),
  ('ITE6102',   'Computer Programming 1',               3.0, true)
) AS v(code, title, units, owned_by_program)
CROSS JOIN programs p
WHERE p.code = 'WADT'
ON CONFLICT (code) DO UPDATE
  SET title = EXCLUDED.title,
      program_id = EXCLUDED.program_id,
      updated_at = NOW();

-- ─── Timetable ───────────────────────────────────────────────────────────────
-- Rebuilt on every run: section_schedule_entries has no unique key, so without
-- this the entries would double. Scoped to WADT-1C and nothing else.
--
-- Note this replaces whatever WADT-1C had before, including the six-subject
-- placeholder block that prisma/seed.ts writes.

DELETE FROM section_schedule_entries
WHERE section_id IN (
  SELECT s.id
  FROM sections s
  JOIN academic_years ay ON ay.id = s.academic_year_id
  JOIN programs p ON p.id = s.program_id
  WHERE s.name = 'WADT-1C'
    AND ay.name = '2026-2027'
    AND p.code = 'WADT'
);

-- Instructor names are verbatim from the sheet. "New Math 2", "New ISM" and
-- "PART TIME" are the registrar's placeholders for unfilled posts — replace
-- them with an UPDATE once the hires are known.

INSERT INTO section_schedule_entries
  (id, subject_code, subject_title, day, start_time, end_time, room, instructor, section_id, created_at, updated_at)
SELECT
  'sched_wadt1c_' || lpad((row_number() OVER (ORDER BY v.ord, d.day))::text, 2, '0'),
  v.code,
  v.title,
  d.day::"Weekday",
  v.start_time,
  v.end_time,
  v.room,
  v.instructor,
  s.id,
  NOW(),
  NOW()
FROM (VALUES
  ( 1, 'GE6114',    'Mathematics in the Modern World',     ARRAY['MONDAY','THURSDAY'],  '07:30', '09:00', 'B403',   'New Math 2'),
  ( 2, 'GE6106',    'Purposive Communication 1',           ARRAY['MONDAY','THURSDAY'],  '09:00', '10:30', 'B403',   'Hughes'),
  ( 3, 'MATH6316',  'Linear Algebra',                      ARRAY['MONDAY','THURSDAY'],  '10:30', '12:00', 'B403',   'Ygot'),
  ( 4, 'ITE6101',   'Computer Fundamentals (LAB)',         ARRAY['MONDAY','THURSDAY'],  '13:00', '14:30', 'SLAB 4', 'Sususco'),
  ( 5, 'ITE6101',   'Computer Fundamentals (LEC)',         ARRAY['MONDAY','THURSDAY'],  '14:30', '16:00', 'A201',   'Sususco'),
  ( 6, 'NSTP6101',  'National Service Training Program 1', ARRAY['MONDAY','THURSDAY'],  '16:00', '17:30', 'A201',   'Negro'),
  ( 7, 'ETHNS6101', 'Euthenics 1',                         ARRAY['MONDAY'],             '17:30', '18:30', 'B202',   'Valiente'),
  ( 8, 'PHYED6104', 'PATHFIT 1',                           ARRAY['THURSDAY'],           '17:30', '18:30', 'B202',   'PART TIME'),
  ( 9, 'GE6100',    'Understanding the Self',              ARRAY['TUESDAY','FRIDAY'],   '07:30', '09:00', 'B605',   'New ISM'),
  (10, 'ITE6102',   'Computer Programming 1 (LEC)',        ARRAY['TUESDAY','FRIDAY'],   '09:00', '10:30', 'B605',   'Leal'),
  (11, 'ITE6102',   'Computer Programming 1 (LAB)',        ARRAY['TUESDAY','FRIDAY'],   '10:30', '12:00', 'SLAB 4', 'Leal'),
  -- The sheet leaves the code column blank for homeroom; subject_code is NOT
  -- NULL, so it gets one of its own.
  (12, 'HOMEROOM',  'Homeroom',                            ARRAY['TUESDAY'],            '13:00', '14:00', 'C105',   'New Math 2')
) AS v(ord, code, title, days, start_time, end_time, room, instructor)
CROSS JOIN LATERAL unnest(v.days) AS d(day)
CROSS JOIN (
  SELECT s.id
  FROM sections s
  JOIN academic_years ay ON ay.id = s.academic_year_id
  JOIN programs p ON p.id = s.program_id
  WHERE s.name = 'WADT-1C'
    AND ay.name = '2026-2027'
    AND p.code = 'WADT'
) AS s;

COMMIT;

-- ─── Check ───────────────────────────────────────────────────────────────────
-- Expect 21 rows: MON 7, TUE 5, THU 7, FRI 3.

SELECT e.day, e.start_time, e.end_time, e.subject_code, e.subject_title, e.room, e.instructor
FROM section_schedule_entries e
JOIN sections s ON s.id = e.section_id
WHERE s.name = 'WADT-1C'
ORDER BY
  array_position(ARRAY['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY']::"Weekday"[], e.day),
  e.start_time;

-- ─── If an earlier run created BSCS-1A ───────────────────────────────────────
-- The first version of this script loaded the sheet against a BSCS-1A section.
-- If you ran it, this removes that section and its 21 entries. Read it before
-- running it, and drop the second statement if BSCS is a real programme here.
-- Deliberately left commented out and outside the transaction above.
--
--   DELETE FROM sections s
--   USING academic_years ay, programs p
--   WHERE s.academic_year_id = ay.id AND s.program_id = p.id
--     AND s.name = 'BSCS-1A' AND ay.name = '2026-2027' AND p.code = 'BSCS';
--
--   DELETE FROM programs p
--   WHERE p.code = 'BSCS'
--     AND NOT EXISTS (SELECT 1 FROM sections s WHERE s.program_id = p.id);
