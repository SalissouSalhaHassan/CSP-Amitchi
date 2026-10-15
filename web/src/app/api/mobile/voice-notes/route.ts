import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "../_lib/auth";

export const dynamic = "force-dynamic";

// In-memory or fallback storage for voice notes
const voiceNotesCache: Array<{
  id: number;
  studentId: number;
  studentName?: string;
  teacherName: string;
  subjectName: string;
  language: string; // "Français" | "Hausa" | "Zarma" | "Arabe"
  audioUrl: string;
  durationSeconds: number;
  transcript?: string;
  createdAt: string;
}> = [];

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const searchParams = request.nextUrl.searchParams;
  const studentId = Number(searchParams.get("studentId"));

  const filtered = studentId
    ? voiceNotesCache.filter((n) => n.studentId === studentId)
    : voiceNotesCache;

  // Add default demo voice notes if empty
  const notes = filtered.length > 0
    ? filtered
    : [
        {
          id: 101,
          studentId: studentId || 1,
          teacherName: "M. Abdoulaye Garba",
          subjectName: "Mathématiques",
          language: "Français",
          audioUrl: "https://actions.google.com/sounds/v1/speech/positive_feedback.ogg",
          durationSeconds: 18,
          transcript: "Très bon travail en géométrie cette semaine. Continue ainsi les efforts sur les équations !",
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: 102,
          studentId: studentId || 1,
          teacherName: "Mme. Mariama Oumarou",
          subjectName: "Français",
          language: "Hausa",
          audioUrl: "https://actions.google.com/sounds/v1/speech/positive_feedback.ogg",
          durationSeconds: 22,
          transcript: "Yaronka yana kokari sosai a fannin karatu, sai dai yana bukatar karin mai da hankali a rubutu.",
          createdAt: new Date(Date.now() - 172800000).toISOString(),
        },
      ];

  return NextResponse.json({
    success: true,
    data: notes,
  });
}

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const body = await request.json();
    const { studentId, studentName, subjectName, language, transcript, durationSeconds, audioBase64 } = body;

    if (!studentId || !subjectName) {
      return mobileJsonError("studentId et subjectName requis.", 400);
    }

    const newNote = {
      id: Date.now(),
      studentId: Number(studentId),
      studentName: studentName || "Élève",
      teacherName: (user as any).name || user.utilisateur || "Enseignant",
      subjectName,
      language: language || "Français",
      audioUrl: audioBase64 ? "data:audio/mp3;base64,..." : "https://actions.google.com/sounds/v1/speech/positive_feedback.ogg",
      durationSeconds: Number(durationSeconds) || 15,
      transcript: transcript || `Note vocale en ${language || "Français"} enregistrée par l'enseignant.`,
      createdAt: new Date().toISOString(),
    };

    voiceNotesCache.unshift(newNote);

    return NextResponse.json({
      success: true,
      data: newNote,
    });
  } catch (error: any) {
    console.error("[Voice Notes POST Error]:", error);
    return mobileJsonError(error?.message || "Erreur d'enregistrement vocal", 500);
  }
}
