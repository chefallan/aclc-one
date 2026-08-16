import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Weekday } from "@prisma/client";
import { ScheduleCalendar } from "@/components/schedule/schedule-calendar";

/**
 * The month view, rendered.
 *
 * The date maths is covered in calendar.test.ts. What is checked here is the
 * part that only shows up once it is on screen: that a class lands on the
 * right squares, that the term stops it, that navigation moves a month at a
 * time, and that a keyboard can reach every day.
 */

const entry = (
  id: string,
  day: Weekday,
  startTime: string,
  endTime: string,
  subjectCode: string,
  room: string | null = null
) => ({ id, day, startTime, endTime, subjectCode, subjectTitle: null, room, instructor: null });

const WEEK = [
  entry("a", "MONDAY", "08:00", "09:30", "CC 105", "COMLAB 2"),
  entry("b", "MONDAY", "13:00", "16:00", "IT 402", "RM 304"),
  entry("c", "WEDNESDAY", "13:00", "16:00", "IT 402", "RM 304"),
  entry("d", "SATURDAY", "08:00", "10:00", "PE 4", "GYM"),
];

const TERM = { start: "2026-06-01", end: "2027-03-31" };

/** 17 August 2026 is a Monday. Every expectation below is anchored to it. */
beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 7, 17, 9, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

/** The day buttons carry the date in their accessible name. */
const dayButton = (label: RegExp | string) => screen.getByRole("button", { name: label });

describe("the month grid", () => {
  it("opens on the current month with today selected", () => {
    render(<ScheduleCalendar entries={WEEK} term={TERM} />);

    expect(screen.getByRole("grid", { name: "August 2026" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "August 2026" })).toBeInTheDocument();
    // The detail panel is showing today, not a month summary.
    expect(screen.getByText("Monday, 17 August")).toBeInTheDocument();
  });

  it("marks today, and only today", () => {
    render(<ScheduleCalendar entries={WEEK} term={TERM} />);
    const today = screen.getAllByRole("button", { current: "date" });
    expect(today).toHaveLength(1);
    expect(today[0]).toHaveAccessibleName(/Monday, 17 August/);
  });

  it("puts a class on every date its weekday falls on", () => {
    render(<ScheduleCalendar entries={WEEK} term={TERM} />);

    // Mondays in August 2026: 3, 10, 17, 24, 31.
    for (const d of [3, 10, 17, 24, 31]) {
      expect(dayButton(new RegExp(`Monday, ${d} August`))).toHaveAccessibleName(
        /CC 105 at 8:00 AM.*IT 402 at 1:00 PM/
      );
    }
    // Tuesday has nothing on this timetable.
    expect(dayButton(/Tuesday, 18 August/)).toHaveAccessibleName(/no classes/);
  });

  it("lists a day's classes in time order when it is picked", async () => {
    const user = userEvent.setup();
    render(<ScheduleCalendar entries={WEEK} term={TERM} />);

    await user.click(dayButton(/Saturday, 22 August/));

    expect(screen.getByText("Saturday, 22 August")).toBeInTheDocument();
    expect(screen.getByText("PE 4")).toBeInTheDocument();
    expect(screen.getByText(/8:00 AM–10:00 AM · GYM/)).toBeInTheDocument();
    // Monday's subjects are not on a Saturday.
    expect(screen.queryByText("CC 105")).not.toBeInTheDocument();
  });

  it("says so plainly on an empty day", async () => {
    const user = userEvent.setup();
    render(<ScheduleCalendar entries={WEEK} term={TERM} />);

    await user.click(dayButton(/Sunday, 23 August/));
    expect(screen.getByText("No classes")).toBeInTheDocument();
  });
});

describe("the term", () => {
  it("stops the pattern repeating outside the school year", async () => {
    const user = userEvent.setup();
    render(<ScheduleCalendar entries={WEEK} term={TERM} />);

    // April 2027 is past the end of term. Its Mondays must be bare.
    for (let i = 0; i < 8; i++) {
      await user.click(screen.getByRole("button", { name: /Next month/ }));
    }
    expect(screen.getByRole("heading", { name: "April 2027" })).toBeInTheDocument();
    expect(dayButton(/Monday, 5 April/)).toHaveAccessibleName(/no classes/);
    expect(screen.getByText("No classes this month")).toBeInTheDocument();
  });

  it("keeps the pattern on the last day of term", async () => {
    const user = userEvent.setup();
    render(<ScheduleCalendar entries={WEEK} term={TERM} />);

    for (let i = 0; i < 7; i++) {
      await user.click(screen.getByRole("button", { name: /Next month/ }));
    }
    expect(screen.getByRole("heading", { name: "March 2027" })).toBeInTheDocument();
    // 31 March 2027 is a Wednesday and the last day of term.
    expect(dayButton(/Wednesday, 31 March/)).toHaveAccessibleName(/IT 402/);
  });

  it("repeats forever when no term is given", async () => {
    const user = userEvent.setup();
    render(<ScheduleCalendar entries={WEEK} />);

    for (let i = 0; i < 8; i++) {
      await user.click(screen.getByRole("button", { name: /Next month/ }));
    }
    expect(dayButton(/Monday, 5 April/)).toHaveAccessibleName(/CC 105/);
  });
});

describe("moving around", () => {
  it("steps a month at a time, and back to today", async () => {
    const user = userEvent.setup();
    render(<ScheduleCalendar entries={WEEK} term={TERM} />);

    await user.click(screen.getByRole("button", { name: /Next month/ }));
    expect(screen.getByRole("heading", { name: "September 2026" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Previous month/ }));
    await user.click(screen.getByRole("button", { name: /Previous month/ }));
    expect(screen.getByRole("heading", { name: "July 2026" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Today" }));
    expect(screen.getByRole("heading", { name: "August 2026" })).toBeInTheDocument();
    expect(screen.getByText("Monday, 17 August")).toBeInTheDocument();
  });

  it("crosses the year boundary", async () => {
    const user = userEvent.setup();
    render(<ScheduleCalendar entries={WEEK} term={TERM} />);

    for (let i = 0; i < 5; i++) {
      await user.click(screen.getByRole("button", { name: /Next month/ }));
    }
    expect(screen.getByRole("heading", { name: "January 2027" })).toBeInTheDocument();
  });

  it("shows what the month adds up to once no single day is picked", async () => {
    const user = userEvent.setup();
    render(<ScheduleCalendar entries={WEEK} term={TERM} />);

    await user.click(screen.getByRole("button", { name: /Next month/ }));

    // September 2026: 4 Mondays, 5 Wednesdays -> IT 402 meets 9 times, 27 h.
    expect(screen.getByText("9 meetings · 27 h")).toBeInTheDocument();
    expect(screen.getByText(/hours in total/)).toBeInTheDocument();
  });
});

describe("reaching it with a keyboard", () => {
  it("keeps one day tabbable and moves it with the arrows", async () => {
    const user = userEvent.setup();
    render(<ScheduleCalendar entries={WEEK} term={TERM} />);

    // Exactly one day is in the tab order — 42 stops would be unusable.
    const tabbable = screen
      .getAllByRole("button")
      .filter((b) => b.getAttribute("aria-pressed") !== null && b.tabIndex === 0);
    expect(tabbable).toHaveLength(1);

    tabbable[0].focus();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toHaveAccessibleName(/Tuesday, 18 August/);

    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toHaveAccessibleName(/Tuesday, 25 August/);

    await user.keyboard("{ArrowUp}{ArrowLeft}");
    expect(document.activeElement).toHaveAccessibleName(/Monday, 17 August/);
  });

  it("turns the page when the arrows walk off the month", async () => {
    const user = userEvent.setup();
    render(<ScheduleCalendar entries={WEEK} term={TERM} />);

    const start = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("aria-current") === "date")!;
    start.focus();

    // 17 August + 3 weeks = 7 September.
    await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}");
    expect(screen.getByRole("heading", { name: "September 2026" })).toBeInTheDocument();
    expect(document.activeElement).toHaveAccessibleName(/Monday, 7 September/);
  });

  it("does not land on the 3rd of March when paging back from the 31st", async () => {
    const user = userEvent.setup();
    render(<ScheduleCalendar entries={WEEK} term={TERM} />);

    await user.click(dayButton(/Monday, 31 August/));
    await user.keyboard("{PageUp}");

    // July has 31 days, so this one is exact...
    expect(screen.getByRole("heading", { name: "July 2026" })).toBeInTheDocument();
    expect(document.activeElement).toHaveAccessibleName(/Friday, 31 July/);

    // ...and from 31 July, PageUp has to clamp to 30 June, not roll into July.
    await user.keyboard("{PageUp}");
    expect(screen.getByRole("heading", { name: "June 2026" })).toBeInTheDocument();
    expect(document.activeElement).toHaveAccessibleName(/Tuesday, 30 June/);
  });
});

describe("an empty timetable", () => {
  it("says there is nothing to show rather than rendering a bare grid", () => {
    render(<ScheduleCalendar entries={[]} term={TERM} />);
    expect(screen.getByText("Nothing to put on a calendar yet")).toBeInTheDocument();
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
  });
});
