import { describe, it, expect } from "vitest";
import { calculateProgress, formatDuration, formatHours, sanitizeFilename } from "@/lib/utils";

describe("calculateProgress", () => {
  it("calculates correct percentage", () => {
    expect(calculateProgress(50, 100)).toBe(50);
    expect(calculateProgress(75, 100)).toBe(75);
    expect(calculateProgress(0, 100)).toBe(0);
  });

  it("caps at 100%", () => {
    expect(calculateProgress(150, 100)).toBe(100);
  });

  it("handles zero required", () => {
    expect(calculateProgress(50, 0)).toBe(0);
  });
});

describe("formatDuration", () => {
  it("formats hours and minutes", () => {
    expect(formatDuration(90)).toBe("1h 30m");
    expect(formatDuration(60)).toBe("1h");
    expect(formatDuration(30)).toBe("30m");
  });
});

describe("formatHours", () => {
  it("formats decimal hours", () => {
    expect(formatHours(8)).toBe("8h");
    expect(formatHours(8.5)).toBe("8.5h");
  });
});

describe("sanitizeFilename", () => {
  it("sanitizes special characters", () => {
    expect(sanitizeFilename("Hello World!")).toBe("hello_world_");
    expect(sanitizeFilename("file.name.txt")).toBe("file.name.txt");
  });
});
