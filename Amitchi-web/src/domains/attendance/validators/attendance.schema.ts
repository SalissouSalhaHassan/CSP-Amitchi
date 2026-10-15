import { z } from "zod";

export const attendanceRecordSchema = z.object({
  studentId: z.number(),
  status: z.string().default("Présent"),
  remark: z.string().nullish(),
});

export const batchAttendanceSchema = z.object({
  classId: z.number(),
  subjectId: z.number().nullish(),
  employeeId: z.number().nullish(),
  date: z.string(),
  records: z.array(attendanceRecordSchema),
  sendSMS: z.boolean().optional().default(false),
  sendWhatsApp: z.boolean().optional().default(false),
});

export type AttendanceRecord = z.infer<typeof attendanceRecordSchema>;
export type BatchAttendanceFormData = z.infer<typeof batchAttendanceSchema>;
