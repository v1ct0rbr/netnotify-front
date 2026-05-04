import type { AvailabilityWindow } from "@/store/useFormStore";

export const DAYS_OF_WEEK = [
  { label: "Seg", value: "1" },
  { label: "Ter", value: "2" },
  { label: "Qua", value: "3" },
  { label: "Qui", value: "4" },
  { label: "Sex", value: "5" },
  { label: "Sab", value: "6" },
  { label: "Dom", value: "7" },
];

export const DAY_NAMES = Object.fromEntries(DAYS_OF_WEEK.map((day) => [day.value, day.label])) as Record<
  string,
  string
>;

export type OfficeHoursSummaryItem = {
  day: string;
  intervals: string[];
};

export const normalizeAvailabilityWindows = (input: unknown): AvailabilityWindow[] => {
  try {
    const parsed = typeof input === "string" ? JSON.parse(input) : input;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.flatMap((entry): AvailabilityWindow[] => {
      if (!entry || typeof entry !== "object") {
        return [];
      }

      const candidate = entry as {
        day?: unknown;
        startTime?: unknown;
        endTime?: unknown;
        intervals?: Array<{ startTime?: unknown; endTime?: unknown }>;
      };
      const day = candidate.day != null ? String(candidate.day).trim() : "";
      if (!day) {
        return [];
      }

      if (Array.isArray(candidate.intervals)) {
        return candidate.intervals.flatMap((interval) => {
          const startTime = interval?.startTime != null ? String(interval.startTime).trim() : "";
          const endTime = interval?.endTime != null ? String(interval.endTime).trim() : "";
          return startTime && endTime ? [{ day, startTime, endTime }] : [];
        });
      }

      const startTime = candidate.startTime != null ? String(candidate.startTime).trim() : "";
      const endTime = candidate.endTime != null ? String(candidate.endTime).trim() : "";
      return startTime && endTime ? [{ day, startTime, endTime }] : [];
    });
  } catch {
    return [];
  }
};

export const buildOfficeHoursSummary = (input: unknown): OfficeHoursSummaryItem[] => {
  try {
    const entries = normalizeAvailabilityWindows(input);
    if (!entries.length) {
      return [];
    }

    const grouped = new Map<string, string[]>();

    entries.forEach((entry) => {
      const day = String(entry.day ?? "").trim();
      if (!day) return;
      const interval = `${entry.startTime}-${entry.endTime}`;
      const current = grouped.get(day) ?? [];
      current.push(interval);
      grouped.set(day, current);
    });

    return DAYS_OF_WEEK.map((day) => {
      const intervals = grouped.get(day.value) ?? [];
      return {
        day: day.label,
        intervals: [...new Set(intervals)].sort((a, b) => a.localeCompare(b)),
      };
    }).filter((item) => item.intervals.length > 0);
  } catch {
    return [];
  }
};

export const parseTimeToMinutes = (value: string): number | null => {
  const trimmed = value.trim();
  const match = /^(\d{2}):(\d{2})$/.exec(trimmed);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
};
