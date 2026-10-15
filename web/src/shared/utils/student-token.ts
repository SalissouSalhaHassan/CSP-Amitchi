import crypto from "crypto";

const SECRET_SALT = process.env.STUDENT_ID_SECRET_SALT || "EDUT_STUDENT_SMART_ID_SECURE_KEY_2026";

export interface StudentTokenPayload {
  studentId: number;
  schoolId: number;
  matricule: string;
  timestamp: number;
}

/**
 * Generates a signed, tamper-proof student token string for QR generation.
 * Format: `EDUT-STU.{base64Payload}.{signature}`
 */
export function generateStudentToken(payload: StudentTokenPayload): string {
  const jsonStr = JSON.stringify(payload);
  const base64Payload = Buffer.from(jsonStr).toString("base64url");
  const signature = crypto
    .createHmac("sha256", SECRET_SALT)
    .update(base64Payload)
    .digest("hex")
    .slice(0, 16);

  return `EDUT-STU.${base64Payload}.${signature}`;
}

/**
 * Validates and decodes a student token.
 * Supports legacy formats, JSON payloads, or pure student IDs seamlessly.
 */
export function decodeStudentToken(token: string): StudentTokenPayload | null {
  if (!token) return null;

  // Format 1: Signed EDUT token
  if (token.startsWith("EDUT-STU.")) {
    const parts = token.split(".");
    if (parts.length === 3) {
      const [, base64Payload, signature] = parts;
      const expectedSig = crypto
        .createHmac("sha256", SECRET_SALT)
        .update(base64Payload)
        .digest("hex")
        .slice(0, 16);

      if (signature === expectedSig) {
        try {
          const jsonStr = Buffer.from(base64Payload, "base64url").toString("utf-8");
          return JSON.parse(jsonStr) as StudentTokenPayload;
        } catch {
          return null;
        }
      }
    }
  }

  // Format 2: JSON payload { studentId, matricule, schoolId }
  if (token.startsWith("{") && token.endsWith("}")) {
    try {
      const parsed = JSON.parse(token);
      if (parsed.studentId || parsed.id) {
        return {
          studentId: Number(parsed.studentId || parsed.id),
          schoolId: Number(parsed.schoolId || 0),
          matricule: String(parsed.matricule || ""),
          timestamp: Number(parsed.timestamp || Date.now()),
        };
      }
    } catch {
      return null;
    }
  }

  // Format 3: Colon separated EDUT-ID:123:9:MAT100
  if (token.startsWith("EDUT-ID:")) {
    const parts = token.split(":");
    if (parts.length >= 2) {
      return {
        studentId: Number(parts[1]),
        schoolId: Number(parts[2] || 0),
        matricule: parts[3] || "",
        timestamp: Date.now(),
      };
    }
  }

  // Format 4: Pure numeric ID
  const numericId = Number(token);
  if (!isNaN(numericId) && numericId > 0) {
    return {
      studentId: numericId,
      schoolId: 0,
      matricule: "",
      timestamp: Date.now(),
    };
  }

  return null;
}
