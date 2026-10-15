export interface AcademicSession {
  id: number;
  sessionName: string;
}

export interface AcademicLevel {
  id: string;
  name: string;
}

export interface AcademicClass {
  id: number;
  className: string;
  sectionId?: number;
}

export interface AcademicSubject {
  id: number;
  subjectName: string;
  coefficient: number;
}

export interface AcademicSection {
  id: number;
  sectionName: string;
  educationalLevel: string;
  termLabels?: string;
  numTerms?: number;
  minPassingGrade?: number;
}

export interface GradingScale {
  name: string;
  baseScore: number;
  description?: string;
}

export interface StudentGradeRow {
  studentId: number;
  matricule: string;
  name: string;
  presents: number;
  absents: number;
  classWork: string; // MOY. CLASSE
  examNote: string; // NOTE COMPO
  total: number;
  average: number;
  weighted: number;
  rank: string;
  observation: string;
  appreciation: string;
  history?: string;
  fullStudent?: any;
}

export interface BroadsheetData {
  students: any[];
  subjects: AcademicSubject[];
  isCumulative: boolean;
}
