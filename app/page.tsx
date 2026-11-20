"use client";

import { useState } from "react";
import type { WebsocCourse } from "websoc-api";
import SectionCard from "@/components/SectionCard";
import { departments } from "@/departments";

const courseColors = [
  "bg-blue-100 border-blue-300",
  "bg-green-100 border-green-300",
  "bg-purple-100 border-purple-300",
  "bg-orange-100 border-orange-300",
  "bg-pink-100 border-pink-300",
  "bg-yellow-100 border-yellow-300",
];

type CalendarMeeting = {
  course: WebsocCourse;
  section: WebsocCourse["sections"][number];
  meeting: WebsocCourse["sections"][number]["meetings"][number];
  day: string;
  startMinutes: number;
  endMinutes: number;
};

function getCourseColor(
  deptCode: string,
  courseNumber: string
) {
  const key = `${deptCode}-${courseNumber}`;

  let hash = 0;

  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % courseColors.length;

  return courseColors[index];
}

function meetingsOverlap(
  first: CalendarMeeting,
  second: CalendarMeeting
) {
  return (
    first.startMinutes < second.endMinutes &&
    second.startMinutes < first.endMinutes
  );
}

export default function Home() {
  const [search, setSearch] = useState("");
  const [courses, setCourses] = useState<WebsocCourse[]>([]);
  const [department, setDepartment] = useState("I&C SCI");
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  type ScheduledSection = {
    course: WebsocCourse;
    section: WebsocCourse["sections"][number];
  };

  const [schedule, setSchedule] = useState<ScheduledSection[]>([]);

  async function handleSearch() {
  setIsLoading(true);
  setError(null);

  try {
    const params = new URLSearchParams({ department, courseNumber: search });
    const response = await fetch(`/api/courses?${params.toString()}`);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error ?? "Search failed");
    }

    setCourses(await response.json());
    setSelectedCourse(null);
  } catch (err) {
    setCourses([]);
    setError(err instanceof Error ? err.message : "Something went wrong");
  } finally {
    setIsLoading(false);
  }
}

  function sectionsConflict(
  first: WebsocCourse["sections"][number],
  second: WebsocCourse["sections"][number]
) {
  for (const firstMeeting of first.meetings) {
    const firstDays = getMeetingDays(firstMeeting.days);
    const firstTime = getMeetingTimeRange(firstMeeting.time);

    if (!firstTime) {
      continue;
    }

    for (const secondMeeting of second.meetings) {
      const secondDays = getMeetingDays(secondMeeting.days);
      const secondTime = getMeetingTimeRange(secondMeeting.time);

      if (!secondTime) {
        continue;
      }

      const shareDay = firstDays.some((day) =>
        secondDays.includes(day)
      );

      if (!shareDay) {
        continue;
      }

      const timesOverlap =
        firstTime.startMinutes < secondTime.endMinutes &&
        secondTime.startMinutes < firstTime.endMinutes;

      if (timesOverlap) {
        return true;
      }
    }
  }

  return false;
}

  function toggleSection(course: WebsocCourse, section: WebsocCourse["sections"][number])
    {
      const isSameCourse = (item: ScheduledSection) => 
        item.course.deptCode === course.deptCode &&
        item.course.courseNumber === course.courseNumber;

      const alreadySelected = schedule.some(
      (item) => isSameCourse(item) && item.section.sectionCode === section.sectionCode
      );

      if (alreadySelected) {
        setSchedule(
          schedule.filter(
            (item) =>
              !(isSameCourse(item) && item.section.sectionCode === section.sectionCode)
          )
        );
        return;
      }

      const withoutSameType = schedule.filter(
        (item) =>
          !(isSameCourse(item) && item.section.sectionType === section.sectionType)
      );

      const conflicts = withoutSameType.filter((item) =>
      sectionsConflict(item.section, section)
      );

      if (conflicts.length > 0) {
        const conflictNames = conflicts
          .map(
            (item) =>
              `${item.course.deptCode} ${item.course.courseNumber} ${item.section.sectionType} ${item.section.sectionCode}`
          )
          .join("\n");

        const confirmed = window.confirm(
          `Schedule conflict!\n\n` +
            `${course.deptCode} ${course.courseNumber} ${section.sectionType} ${section.sectionCode} ` +
            `overlaps with:\n\n${conflictNames}\n\nAdd this section anyway?`
        );

        if (!confirmed) return;
      }
      setSchedule([...withoutSameType, { course, section }]);
    }


  function parseClockTime(value: string, period?: "a" | "p") {
  const match = value.match(/^(\d{1,2}):(\d{2})([ap])?$/i);

  if (!match) {
    return null;
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const suffix = (match[3]?.toLowerCase() ?? period) as "a" | "p" | undefined;

  if (suffix === "p" && hours !== 12) {
    hours += 12;
  }

  if (suffix === "a" && hours === 12) {
    hours = 0;
  }

  return hours * 60 + minutes;
}

function getMeetingTimeRange(time: string) {
  const parts = time
    .toLowerCase()
    .replace(/\s+/g, "")
    .split("-");

  if (parts.length !== 2) {
    return null;
  }

  const [startText, endText] = parts;

  const endMinutes = parseClockTime(endText);

  if (endMinutes === null) {
    return null;
  }

  // If the start already contains a or p, use it directly.
  if (/[ap]$/i.test(startText)) {
    const startMinutes = parseClockTime(startText);

    if (startMinutes === null) {
      return null;
    }

    return { startMinutes, endMinutes };
  }

  // The start has no a/p, so try both AM and PM.
  const possibleStarts = [
    parseClockTime(startText, "a"),
    parseClockTime(startText, "p"),
  ].filter((value): value is number => value !== null);

  // Pick the interpretation that creates a reasonable
  // positive class duration.
  const validStarts = possibleStarts.filter(
    (start) => start < endMinutes && endMinutes - start <= 12 * 60
  );

  if (validStarts.length === 0) {
    return null;
  }

  const startMinutes = validStarts.sort(
    (a, b) => endMinutes - a - (endMinutes - b)
  )[0];

  return {
    startMinutes,
    endMinutes,
  };
}

  function getMeetingDays(days: string) {
    const normalized = days.toUpperCase().replace(/\s/g, "");

    const dayMap: Record<string, string> = {
      M: "Monday",
      TU: "Tuesday",
      W: "Wednesday",
      TH: "Thursday",
      F: "Friday",
    };

    const result: string[] = [];

    let i = 0;

    while (i < normalized.length) {
      if (normalized.startsWith("TH", i)) {
        result.push(dayMap.TH);
        i += 2;
      } else if (normalized.startsWith("TU", i)) {
        result.push(dayMap.TU);
        i += 2;
      } else if (dayMap[normalized[i]]) {
        result.push(dayMap[normalized[i]]);
        i += 1;
      } else {
        i += 1;
      }
    }

    return result;
  }

  function formatHour(hour: number) {
    if (hour === 12) return "12 PM";
    if (hour > 12) return `${hour - 12} PM`;
    return `${hour} AM`;
  }



  return (
    <main className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <h1 className="text-4xl font-bold text-gray-900">
            UCI Schedule Planner
          </h1>

          <p className="mt-1 text-gray-600">
            Build your personalized class schedule at UC Irvine.
          </p>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        {/* TWO-COLUMN LAYOUT */}
        <div className="grid grid-cols-2 gap-8">
          {/* ================================= */}
          {/* LEFT SIDE - COURSE SEARCH */}
          {/* ================================= */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Select your courses
            </h2>

            <p className="mt-2 text-gray-600">
              Add the classes you want to take to find schedules that work
              together.
            </p>

            {/* SEARCH BAR */}
            <div className="mt-8 flex flex-wrap gap-4">
              {/* DEPARTMENT */}
              <select
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900"
              >
                {departments.map((department) => (
                  <option key={department.code} value={department.code}>
                    {department.name}
                  </option>
                ))}
              </select>
                
              {/* COURSE NUMBER */}
              <input
                type="text"
                placeholder="Search for a course..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900"
              />

              {/* SEARCH BUTTON */}
              <button
                onClick={handleSearch}
                className="rounded-lg bg-black px-6 py-3 font-medium text-white"
              >
                Search
              </button>
            </div>
            
            {/* MY SCHEDULE */}
              <div className="mt-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">
                    My Schedule
                  </h2>

                  {schedule.length > 0 && (
                    <button
                      onClick={() => setSchedule([])}
                      className="text-sm text-gray-500 hover:text-gray-900"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {schedule.length === 0 ? (
                  <p className="mt-3 text-sm text-gray-500">
                    No sections selected yet.
                  </p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {Array.from(
                      new Map(
                        schedule.map((item) => [
                          `${item.course.deptCode}-${item.course.courseNumber}`,
                          {
                            deptCode: item.course.deptCode,
                            courseNumber: item.course.courseNumber,
                            courseTitle: item.course.courseTitle,
                          },
                        ])
                      ).values()
                    ).map((course) => {
                      const courseSections = schedule.filter(
                        (item) =>
                          item.course.deptCode === course.deptCode &&
                          item.course.courseNumber === course.courseNumber
                      );

                      return (
                        <div
                          key={`${course.deptCode}-${course.courseNumber}`}
                          className={`rounded-lg border p-3 ${getCourseColor(
                            course.deptCode,
                            course.courseNumber
                          )}`}
                        >
                          <p className="font-semibold text-gray-900">
                            {course.deptCode} {course.courseNumber}
                          </p>

                          <div className="mt-2 space-y-1">
                            {courseSections.map((item) => (
                              <div
                                key={item.section.sectionCode}
                                className="flex items-center justify-between rounded-md bg-gray-50 px-2 py-1"
                              >
                                <p className="text-sm text-gray-700">
                                  {item.section.sectionType} {item.section.sectionCode}
                                </p>

                                <button
                                  onClick={() =>
                                    setSchedule((current) =>
                                      current.filter(
                                        (scheduled) =>
                                          !(
                                            scheduled.course.deptCode ===
                                              item.course.deptCode &&
                                            scheduled.course.courseNumber ===
                                              item.course.courseNumber &&
                                            scheduled.section.sectionCode ===
                                              item.section.sectionCode
                                          )
                                      )
                                    )
                                  }
                                  className="px-1 text-gray-400 hover:text-gray-900"
                                  aria-label={`Remove ${item.course.deptCode} ${item.course.courseNumber} ${item.section.sectionCode}`}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            {isLoading && <p className="mt-8 text-gray-500">Loading courses…</p>}
            {error && <p className="mt-8 text-red-600">{error}</p>}
            {!isLoading && !error && courses.length === 0 && (
              <p className="mt-8 text-gray-500">No courses to show yet. Try a search.</p>
            )} 
            {/* COURSE RESULTS */}
            {courses.length > 0 && (
              <div className="mt-8 space-y-4">
                {courses.map((course, index) => (
                  <div
                    key={`${course.deptCode}-${course.courseNumber}-${course.courseTitle}`}
                    className="cursor-pointer rounded-lg border border-gray-400 bg-white px-2 py-1"
                  >
                    <div
                      onClick={() =>
                        setSelectedCourse(selectedCourse === index ? null : index)
                      }
                      className="flex cursor-pointer items-center justify-between p-4"
                    >
                      <div>
                        <h2 className="text-lg font-bold text-gray-900">
                          {course.deptCode} {course.courseNumber}
                        </h2>

                        <p className="text-sm text-gray-600">
                          {course.courseTitle}
                        </p>
                      </div>

                      <span className="text-gray-500">
                        {selectedCourse === index ? "▲" : "▼"}
                      </span>
                    </div>

                    {/* SECTIONS */}
                    {selectedCourse === index && (
                      <div className="mt-4">
                        {/* LECTURES */}
                        <h3 className="text-lg font-semibold text-gray-900">
                          Lectures
                        </h3>

                        <div className="mt-3 space-y-2">
                          {course.sections
                            .filter(
                              (section) => section.sectionType === "Lec"
                            )
                            .map((section) => (
                              <SectionCard
                                key={section.sectionCode}
                                section={section}
                                isSelected={schedule.some(
                                  (item) =>
                                    item.course.courseNumber ===
                                      course.courseNumber &&
                                    item.course.deptCode ===
                                      course.deptCode &&
                                    item.section.sectionCode ===
                                      section.sectionCode
                                )}
                                onSelect={() =>
                                  toggleSection(course, section)
                                }
                              />
                            ))}
                        </div>

                        {/* OTHER SECTIONS */}
                        {course.sections.filter(
                          (section) => section.sectionType !== "Lec"
                        ).length > 0 && (
                          <>
                            <h3 className="mt-6 text-lg font-semibold text-gray-900">
                              Other Sections
                            </h3>

                            <div className="mt-4 space-y-3">
                              {course.sections
                                .filter(
                                  (section) =>
                                    section.sectionType !== "Lec"
                                )
                                .map((section) => (
                                  <SectionCard
                                    key={section.sectionCode}
                                    section={section}
                                    isSelected={schedule.some(
                                      (item) =>
                                        item.course.courseNumber ===
                                          course.courseNumber &&
                                        item.course.deptCode ===
                                          course.deptCode &&
                                        item.section.sectionCode ===
                                          section.sectionCode
                                    )}
                                    onSelect={() =>
                                      toggleSection(course, section)
                                    }
                                  />
                                ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ================================= */}
          {/* RIGHT SIDE - YOUR SCHEDULE */}
          {/* ================================= */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Your Schedule
            </h2>

            <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white">
              {/* CALENDAR HEADER */}
              <div className="grid grid-cols-[60px_repeat(5,1fr)] border-b border-gray-300 bg-gray-50">
                <div></div>

                 {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map(
                  (day) => (
                    <div
                      key={day}
                      className="border-l px-2 py-3 text-center text-sm font-semibold text-gray-700"
                    >
                      {day}
                       </div>
                      )
                    )}
                  </div>

                {/* CALENDAR BODY */}
                <div className="relative">
                    {/* TIME ROWS */}
                    {Array.from({ length: 11 }, (_, index) => {
                      const hour = 8 + index;

                      return (  
                        <div
                        key={hour}
                        className="grid h-[60px] grid-cols-[60px_repeat(5,1fr)]"
                      >
                        {/* TIME */}
                        <div className="border-b px-2 pt-1 text-xs text-gray-500">
                          {formatHour(hour)}
                        </div>
                        
                        {/* DAY CELLS */}
                        {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map(
                          (day) => (
                            <div
                            key={day}
                            className="border-b border-l"
                            />
                          )
                        )}
                      </div>
                    );
                  })}
                  {/* CLASS BLOCKS */}
                  {(() => {
                  const calendarMeetings: CalendarMeeting[] = schedule.flatMap(
                    ({ course, section }) =>
                      section.meetings.flatMap((meeting) => {
                        const days = getMeetingDays(meeting.days);
                        const timeRange = getMeetingTimeRange(meeting.time);

                        if (!timeRange) {
                          return [];
                        }

                        return days.map((day) => ({
                          course,
                          section,
                          meeting,
                          day,
                          startMinutes: timeRange.startMinutes,
                          endMinutes: timeRange.endMinutes,
                        }));
                      })
                  );

                  return calendarMeetings.map((calendarMeeting, index) => {
                    const {
                      course,
                      section,
                      meeting,
                      day,
                      startMinutes,
                      endMinutes,
                    } = calendarMeeting;

                    const dayIndex = [
                      "Monday",
                      "Tuesday",
                      "Wednesday",
                      "Thursday",
                      "Friday",
                    ].indexOf(day);

                    if (dayIndex === -1) {
                      return null;
                    }

                    const calendarStart = 8 * 60;
                    const calendarEnd = 19 * 60;

                    if (
                      endMinutes <= calendarStart ||
                      startMinutes >= calendarEnd
                    ) {
                      return null;
                    }


                    const top = ((startMinutes - 8 * 60) / 60) * 60;

                    const height = ((endMinutes - startMinutes) / 60) * 60;

                    // Find every meeting on the same day that overlaps
                    // this meeting.
                    const overlappingMeetings = calendarMeetings.filter(
                      (other) =>
                        other.day === day &&
                        meetingsOverlap(calendarMeeting, other)
                    );

                    // Determine this meeting's position among the
                    // overlapping meetings.
                    const lane = overlappingMeetings.findIndex(
                      (other) =>
                        other.course.deptCode === course.deptCode &&
                        other.course.courseNumber === course.courseNumber &&
                        other.section.sectionCode === section.sectionCode &&
                        other.meeting === meeting
                    );

                    const laneCount = overlappingMeetings.length;

                    return (
                      <div
                        key={`${course.deptCode}-${course.courseNumber}-${section.sectionCode}-${index}`}
                        className={`absolute overflow-hidden rounded-md border p-2 text-xs shadow-sm ${getCourseColor(
                          course.deptCode,
                          course.courseNumber
                        )}`}
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,

                          left: `calc(
                            60px +
                            ${dayIndex} * (100% - 60px) / 5 +
                            ${lane} * (100% - 60px) / 5 / ${laneCount} +
                            2px
                          )`,

                          width: `calc(
                            (100% - 60px) / 5 / ${laneCount} - 4px
                          )`,
                        }}
                      >
                        <div className="font-semibold text-gray-900">
                          {course.deptCode} {course.courseNumber}
                        </div>

                        <div className="text-gray-900">
                          {section.sectionType} {section.sectionCode}
                        </div>

                        <div className="mt-1 text-gray-700">
                          {meeting.time}
                        </div>

                        {laneCount > 1 && (
                          <div className="mt-1 font-semibold text-red-600">
                            Conflict!
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
