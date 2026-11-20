import { callWebSocAPI } from "websoc-api";

const departments = [
  "I&C SCI",
  "MATH",
  "PHYSICS",
  "CHEM",
];

for (const department of departments) {
  try {
    const result = await callWebSocAPI({
      term: "2026Fall",
      department,
    });

    const departmentsFound = result.schools.flatMap(
      (school) => school.departments
    );

    console.log(department, "->", departmentsFound.length, "department(s)");

    for (const dept of departmentsFound) {
      console.log("   ", dept.deptCode, "-", dept.deptName);
    }
  } catch (error) {
    console.log(department, "-> ERROR");
  }
}