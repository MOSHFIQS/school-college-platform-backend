/**
 * Bangladesh JSC / SSC / HSC Grading System
 */

export interface GradeResult {
  grade: string;
  gradePoint: number;
  remark?: string;
  isPassed: boolean;
}

export function calculateGrade(marks: number, fullMarks = 100): GradeResult {
  const pct = (marks / fullMarks) * 100;
  if (pct >= 80) return { grade: 'A+', gradePoint: 5.00, remark: 'Outstanding',   isPassed: true };
  if (pct >= 70) return { grade: 'A',  gradePoint: 4.00, remark: 'Excellent',     isPassed: true };
  if (pct >= 60) return { grade: 'A-', gradePoint: 3.50, remark: 'Very Good',     isPassed: true };
  if (pct >= 50) return { grade: 'B',  gradePoint: 3.00, remark: 'Good',          isPassed: true };
  if (pct >= 40) return { grade: 'C',  gradePoint: 2.00, remark: 'Satisfactory',  isPassed: true };
  if (pct >= 33) return { grade: 'D',  gradePoint: 1.00, remark: 'Pass',          isPassed: true };
  return           { grade: 'F',  gradePoint: 0.00, remark: 'Fail',          isPassed: false };
}

export function calculateGPA(subjects: GradeResult[]): number {
  if (!subjects.length) return 0;
  const total = subjects.reduce((s, r) => s + r.gradePoint, 0);
  return Math.round((total / subjects.length) * 100) / 100;
}

export const BD_GRADE_SCALE = [
  { range: '80–100', grade: 'A+', gpa: '5.00', remark: 'Outstanding' },
  { range: '70–79',  grade: 'A',  gpa: '4.00', remark: 'Excellent' },
  { range: '60–69',  grade: 'A-', gpa: '3.50', remark: 'Very Good' },
  { range: '50–59',  grade: 'B',  gpa: '3.00', remark: 'Good' },
  { range: '40–49',  grade: 'C',  gpa: '2.00', remark: 'Satisfactory' },
  { range: '33–39',  grade: 'D',  gpa: '1.00', remark: 'Pass' },
  { range: '0–32',   grade: 'F',  gpa: '0.00', remark: 'Fail' },
];
