import { callWebSocAPI } from "websoc-api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const departmentCode = searchParams.get("department");
  const courseNumber = searchParams.get("courseNumber")?.trim().toUpperCase();

  if (!departmentCode) {
    return Response.json({ error: "Missing department" }, { status: 400 });
  }

  try {
    const result = await callWebSocAPI({
      term: "2027Winter",
      department: departmentCode,
      ...(courseNumber ? { courseNumber } : {}),
    });

    const department = result.schools
      .flatMap((school) => school.departments)
      .find((dept) => dept.deptCode === departmentCode);

    const courses = department?.courses ?? [];

    return Response.json(
      courseNumber
        ? courses.filter((course) => course.courseNumber === courseNumber)
        : courses
    );
  } catch (error) {
    console.error("WebSOC request failed:", error);
    return Response.json(
      { error: "Could not load courses from WebSOC" },
      { status: 502 }
    );
  }
}