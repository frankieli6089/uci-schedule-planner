import { callWebSocAPI } from "websoc-api";

const result = await callWebSocAPI({
  term: "2026Fall",
  department: "I&C SCI",
  courseNumber: "31",
});

const school = result.schools.find(
  (school) =>
    school.schoolName ===
    "Donald Bren School of Information and Computer Sciences"
);

const department = school.departments.find(
  (department) => department.deptCode === "I&C SCI"
);  

const course = department.courses.find(
  (course) => course.courseNumber === "31"
);

console.log(course.courseNumber);
console.log(course.courseTitle);
console.log(course.sections.length);