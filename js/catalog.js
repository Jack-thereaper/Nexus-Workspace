/*
 * Nexus Workspace: course suggestions (NEWLY IMPLEMENTED).
 * These are COMMON engineering and science course titles, offered as shortcuts only.
 * They are NOT an official list from any school: no course codes, credit units or
 * semesters are assumed. Edit or add your own courses on the Academics page.
 */
(function () {
  "use strict";
  const NX = (window.NX = window.NX || {});

  NX.catalog = {
    programmes: [
      "Computer Engineering", "Electrical and Electronic Engineering", "Mechanical Engineering",
      "Civil Engineering", "Chemical Engineering", "Mechatronics Engineering", "Software Engineering",
      "Computer Science", "Information Technology", "Telecommunications Engineering"
    ],
    groups: [
      { group: "Mathematics and science", courses: [
        "Calculus I", "Calculus II", "Linear Algebra", "Differential Equations", "Engineering Mathematics",
        "Probability and Statistics", "Numerical Methods", "Physics: Mechanics", "Physics: Electricity and Magnetism", "General Chemistry"
      ] },
      { group: "Computing", courses: [
        "Introduction to Programming", "Data Structures and Algorithms", "Object-Oriented Programming", "Discrete Mathematics",
        "Database Systems", "Operating Systems", "Computer Networks", "Software Engineering", "Web Development"
      ] },
      { group: "Electrical and computer engineering", courses: [
        "Circuit Theory I", "Circuit Theory II", "Digital Logic Design", "Electronics I", "Electronics II", "Signals and Systems",
        "Microprocessors and Microcontrollers", "Computer Architecture", "Embedded Systems", "Control Systems",
        "Electromagnetic Fields", "Communication Systems", "Power Systems"
      ] },
      { group: "General studies", courses: [
        "Engineering Drawing", "Communication Skills", "Technical Writing", "Entrepreneurship", "Engineering Ethics"
      ] }
    ]
  };
})();
