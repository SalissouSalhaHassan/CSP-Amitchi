import Dexie, { type Table } from 'dexie';

export interface LocalStudent {
  id?: number;
  schoolId?: number | null;
  numAdmission: string;
  nomEtudiant: string;
  nomArabe?: string | null;
  sexe?: string | null;
  religion?: string | null;
  dateNaissance?: string | null;
  lieuNaissance?: string | null;
  cnic?: string | null;
  groupeSanguin?: string | null;
  session?: string | null;
  educationalLevel?: string | null;
  classe?: string | null;
  section?: string | null;
  categorie?: string | null;
  nomPere?: string | null;
  cnicPere?: string | null;
  mobile?: string | null;
  whatsapp?: string | null;
  fraisMensuels?: number;
  ancienSolde?: number;
  fraisInscription?: number;
  fraisCogesCard?: number;
  fraisTransportInternat?: number;
  statut?: string;
  behaviorScore?: number;
  photoPath?: string | null;
  activationPin?: string | null;
  fingerprintHash?: string | null;
  updatedAt?: number;
}

export interface LocalExam {
  id?: number;
  examName: string;
  classId: number;
  subjectId: number;
  examDate?: string | null;
  periodId?: number | null;
  maxMarks?: number;
  updatedAt?: number;
}

export interface LocalExamResult {
  id?: number;
  examId: number;
  studentId: number;
  marksObtained: number;
  remarks?: string | null;
  updatedAt?: number;
}

export interface LocalSubject {
  id?: number;
  subjectName: string;
  subjectCode?: string | null;
  category?: string | null;
  updatedAt?: number;
}

export interface LocalStudentResult {
  id?: number;
  classId: number;
  subjectId: number;
  sessionId: number;
  term: string;
  studentId: number;
  classWorkScore?: number | null;
  examScore?: number | null;
  totalScore?: number | null;
  coefficient?: number;
  weightedScore?: number | null;
  absences?: number;
  observation?: string | null;
  appreciation?: string | null;
  rank?: string | null;
  updatedAt?: number;
}

export interface LocalDevoirGrade {
  id?: number;
  classId: number;
  subjectId: number;
  sessionId: number;
  term: string;
  studentId: number;
  devoirs: (number | null)[];
  moyenneDevoirs?: number | null;
  updatedAt?: number;
}

export interface LocalReferenceItem {
  id?: number;
  type: "class" | "subject" | "session" | "period" | "section" | "level" | "studentCategory" | "studentFees" | "attendance" | "exams" | "examResults" | "studentResults" | "gradingGrid" | "lmsCache";
  remoteId?: number | string | null;
  label: string;
  payload: any;
  updatedAt?: number;
}

export interface LocalFeePayment {
  id?: number;
  feeId: number;
  amount: number;
  reduction?: number;
  paymentMode?: string;
  reference?: string;
  monthConcerned?: string;
  notes?: string;
  datePaid?: string;
  isProvisoire?: boolean;
  updatedAt?: number;
}

export interface LocalAttendanceBatch {
  id?: number;
  classId: number;
  subjectId?: number | null;
  employeeId?: number | null;
  date: string;
  records: any[];
  sendSMS?: boolean;
  sendWhatsApp?: boolean;
  updatedAt?: number;
}

export interface LocalStudentPhoto {
  numAdmission: string;
  photoData: string;
  updatedAt?: number;
}

export interface LocalStudentAttendance {
  id?: number;
  classId: number;
  subjectId?: number | null;
  date: string;
  studentId: number;
  status: string;
  remark?: string;
  updatedAt?: number;
}

export interface OutboxAction {
  id?: number;
  actionType: 'INSERT' | 'UPDATE' | 'DELETE';
  targetTable: string;
  entity?: string;
  entityId?: string | number | null;
  payload: any;
  status?: "pending" | "syncing" | "synced" | "failed" | "conflict" | "cancelled" | "local draft" | "pending sync" | "validated" | "rejected";
  priority?: number; // 1 = Critical/Students, 2 = Financials, 3 = Academics, 4 = Attendance, 5 = Others
  timestamp: number;
  updatedAt?: number;
  syncedAt?: number | null;
  retryCount?: number;
  lastError?: string | null;
  idempotencyKey?: string;
  userId?: number | string | null;
  schoolId?: number | string | null;
  userName?: string | null;
  schoolName?: string | null;
  conflict?: any;
}

class EdutLocalDatabase extends Dexie {
  students!: Table<LocalStudent>;
  exams!: Table<LocalExam>;
  examResults!: Table<LocalExamResult>;
  studentResults!: Table<LocalStudentResult>;
  devoirGrades!: Table<LocalDevoirGrade>;
  subjects!: Table<LocalSubject>;
  references!: Table<LocalReferenceItem>;
  feePayments!: Table<LocalFeePayment>;
  attendanceBatches!: Table<LocalAttendanceBatch>;
  studentPhotos!: Table<LocalStudentPhoto>;
  studentAttendance!: Table<LocalStudentAttendance>;
  outbox!: Table<OutboxAction>;

  constructor() {
    super('EdutLocalDatabase');
    this.version(1).stores({
      students: '++id, numAdmission, nomEtudiant, classe, statut, updatedAt',
      exams: '++id, examName, classId, subjectId, updatedAt',
      examResults: '++id, examId, studentId, updatedAt',
      subjects: '++id, subjectName, updatedAt',
      outbox: '++id, actionType, targetTable, timestamp',
    });

    this.version(2).stores({
      students: '++id, numAdmission, nomEtudiant, classe, statut, updatedAt',
      exams: '++id, examName, classId, subjectId, updatedAt',
      examResults: '++id, examId, studentId, updatedAt',
      subjects: '++id, subjectName, updatedAt',
      outbox: '++id, actionType, targetTable, timestamp, retryCount',
    });

    this.version(3).stores({
      students: '++id, numAdmission, nomEtudiant, classe, statut, updatedAt',
      exams: '++id, examName, classId, subjectId, updatedAt',
      examResults: '++id, examId, studentId, updatedAt',
      subjects: '++id, subjectName, updatedAt',
      feePayments: '++id, feeId, reference, datePaid, updatedAt',
      outbox: '++id, actionType, targetTable, timestamp, retryCount',
    });

    this.version(4).stores({
      students: '++id, numAdmission, nomEtudiant, classe, statut, updatedAt',
      exams: '++id, examName, classId, subjectId, updatedAt',
      examResults: '++id, examId, studentId, updatedAt',
      subjects: '++id, subjectName, updatedAt',
      references: '++id, type, remoteId, label, updatedAt',
      feePayments: '++id, feeId, reference, datePaid, updatedAt',
      attendanceBatches: '++id, classId, subjectId, date, updatedAt',
      outbox: '++id, actionType, targetTable, status, timestamp, updatedAt, syncedAt, retryCount, idempotencyKey, userId, schoolId',
    });

    this.version(5).stores({
      students: '++id, numAdmission, nomEtudiant, classe, statut, updatedAt',
      exams: '++id, examName, classId, subjectId, updatedAt',
      examResults: '++id, examId, studentId, updatedAt',
      subjects: '++id, subjectName, updatedAt',
      references: '++id, type, remoteId, label, updatedAt',
      feePayments: '++id, feeId, reference, datePaid, updatedAt',
      attendanceBatches: '++id, classId, subjectId, date, updatedAt',
      studentPhotos: 'numAdmission, updatedAt',
      outbox: '++id, actionType, targetTable, status, timestamp, updatedAt, syncedAt, retryCount, idempotencyKey, userId, schoolId',
    });

    this.version(6).stores({
      students: '++id, numAdmission, nomEtudiant, classe, statut, updatedAt',
      exams: '++id, examName, classId, subjectId, updatedAt',
      examResults: '++id, examId, studentId, updatedAt',
      subjects: '++id, subjectName, updatedAt',
      references: '++id, type, remoteId, label, updatedAt',
      feePayments: '++id, feeId, reference, datePaid, updatedAt',
      attendanceBatches: '++id, classId, subjectId, date, updatedAt',
      studentPhotos: 'numAdmission, updatedAt',
      studentAttendance: '++id, classId, subjectId, date, studentId, updatedAt',
      outbox: '++id, actionType, targetTable, status, timestamp, updatedAt, syncedAt, retryCount, idempotencyKey, userId, schoolId',
    });

    this.version(7).stores({
      students: '++id, schoolId, [schoolId+numAdmission], numAdmission, nomEtudiant, classe, statut, updatedAt',
      exams: '++id, examName, classId, subjectId, updatedAt',
      examResults: '++id, examId, studentId, updatedAt',
      subjects: '++id, subjectName, updatedAt',
      references: '++id, type, remoteId, label, updatedAt',
      feePayments: '++id, feeId, reference, datePaid, updatedAt',
      attendanceBatches: '++id, classId, subjectId, date, updatedAt',
      studentPhotos: 'numAdmission, updatedAt',
      studentAttendance: '++id, classId, subjectId, date, studentId, updatedAt',
      outbox: '++id, actionType, targetTable, status, timestamp, updatedAt, syncedAt, retryCount, idempotencyKey, userId, schoolId',
    });

    this.version(8).stores({
      students: '++id, schoolId, [schoolId+numAdmission], numAdmission, nomEtudiant, classe, statut, updatedAt',
      exams: '++id, examName, classId, subjectId, updatedAt',
      examResults: '++id, examId, studentId, updatedAt',
      studentResults: '++id, [classId+subjectId+sessionId+term], classId, subjectId, sessionId, term, studentId, updatedAt',
      devoirGrades: '++id, [classId+subjectId+sessionId+term], classId, subjectId, sessionId, term, studentId, updatedAt',
      subjects: '++id, subjectName, updatedAt',
      references: '++id, type, remoteId, label, updatedAt',
      feePayments: '++id, feeId, reference, datePaid, updatedAt',
      attendanceBatches: '++id, classId, subjectId, date, updatedAt',
      studentPhotos: 'numAdmission, updatedAt',
      studentAttendance: '++id, classId, subjectId, date, studentId, updatedAt',
      outbox: '++id, actionType, targetTable, status, priority, timestamp, updatedAt, syncedAt, retryCount, idempotencyKey, userId, schoolId',
    });
  }
}

export const localDb = new EdutLocalDatabase();
