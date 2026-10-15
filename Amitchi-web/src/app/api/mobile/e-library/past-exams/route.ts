import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";

export const dynamic = "force-dynamic";

const NATIONAL_PAST_EXAMS = [
  // BEPC
  {
    id: "bepc_maths_2025",
    examType: "BEPC",
    title: "Épreuve de Mathématiques - BEPC Session 2025",
    subject: "Mathématiques",
    year: 2025,
    session: "Normale",
    country: "Niger 🇳🇪",
    hasAnswerKey: true,
    fileSize: "1.4 MB",
    pdfUrl: "https://example.com/exams/bepc_maths_2025.pdf",
    answerKeyUrl: "https://example.com/exams/corrige_bepc_maths_2025.pdf",
    description: "Équations, géométrie plane, statistiques et problèmes de synthèse.",
  },
  {
    id: "bepc_pc_2025",
    examType: "BEPC",
    title: "Épreuve de Physique-Chimie - BEPC Session 2025",
    subject: "Physique-Chimie",
    year: 2025,
    session: "Normale",
    country: "Niger 🇳🇪",
    hasAnswerKey: true,
    fileSize: "1.2 MB",
    pdfUrl: "https://example.com/exams/bepc_pc_2025.pdf",
    answerKeyUrl: "https://example.com/exams/corrige_bepc_pc_2025.pdf",
    description: "Mécanique, électricité et réactions acide-base.",
  },
  {
    id: "bepc_francais_2024",
    examType: "BEPC",
    title: "Épreuve de Français (Dictée & Texte) - BEPC 2024",
    subject: "Français",
    year: 2024,
    session: "Normale",
    country: "Niger 🇳🇪",
    hasAnswerKey: true,
    fileSize: "980 KB",
    pdfUrl: "https://example.com/exams/bepc_francais_2024.pdf",
    answerKeyUrl: "https://example.com/exams/corrige_bepc_francais_2024.pdf",
    description: "Texte suivi de questions de compréhension, grammaire et rédaction.",
  },

  // BAC D & C
  {
    id: "bac_d_maths_2025",
    examType: "BAC D",
    title: "Mathématiques - Baccalauréat Série D 2025",
    subject: "Mathématiques",
    year: 2025,
    session: "Normale",
    country: "Niger 🇳🇪",
    hasAnswerKey: true,
    fileSize: "2.1 MB",
    pdfUrl: "https://example.com/exams/bac_d_maths_2025.pdf",
    answerKeyUrl: "https://example.com/exams/corrige_bac_d_maths_2025.pdf",
    description: "Analyse numérique, intégrales, nombres complexes et probabilités.",
  },
  {
    id: "bac_d_svt_2025",
    examType: "BAC D",
    title: "Sciences de la Vie et de la Terre - BAC D 2025",
    subject: "SVT",
    year: 2025,
    session: "Normale",
    country: "Niger 🇳🇪",
    hasAnswerKey: true,
    fileSize: "2.8 MB",
    pdfUrl: "https://example.com/exams/bac_d_svt_2025.pdf",
    answerKeyUrl: "https://example.com/exams/corrige_bac_d_svt_2025.pdf",
    description: "Génétique humaine, immunologie et géologie appliquée.",
  },
  {
    id: "bac_c_pc_2025",
    examType: "BAC C",
    title: "Physique et Chimie - Baccalauréat Série C 2025",
    subject: "Physique-Chimie",
    year: 2025,
    session: "Normale",
    country: "Niger 🇳🇪",
    hasAnswerKey: true,
    fileSize: "2.4 MB",
    pdfUrl: "https://example.com/exams/bac_c_pc_2025.pdf",
    answerKeyUrl: "https://example.com/exams/corrige_bac_c_pc_2025.pdf",
    description: "Mouvements oscillatoires, champ magnétique, chimie organique approfondie.",
  },

  // BAC A
  {
    id: "bac_a_philo_2025",
    examType: "BAC A",
    title: "Philosophie - Baccalauréat Série A 2025",
    subject: "Philosophie",
    year: 2025,
    session: "Normale",
    country: "Niger 🇳🇪",
    hasAnswerKey: true,
    fileSize: "1.1 MB",
    pdfUrl: "https://example.com/exams/bac_a_philo_2025.pdf",
    answerKeyUrl: "https://example.com/exams/corrige_bac_a_philo_2025.pdf",
    description: "Dissertation et commentaire de texte philosophique.",
  },
  {
    id: "bac_a_hg_2024",
    examType: "BAC A",
    title: "Histoire-Géographie - Baccalauréat Série A 2024",
    subject: "Histoire-Géo",
    year: 2024,
    session: "Normale",
    country: "Niger 🇳🇪",
    hasAnswerKey: true,
    fileSize: "1.6 MB",
    pdfUrl: "https://example.com/exams/bac_a_hg_2024.pdf",
    answerKeyUrl: "https://example.com/exams/corrige_bac_a_hg_2024.pdf",
    description: "Le monde depuis 1945 et l'espace économique ouest-africain.",
  },
];

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const searchParams = request.nextUrl.searchParams;
  const examType = searchParams.get("examType"); // BEPC, BAC A, BAC C, BAC D
  const subject = searchParams.get("subject");
  const year = searchParams.get("year");

  let filtered = [...NATIONAL_PAST_EXAMS];

  if (examType && examType !== "Tous") {
    filtered = filtered.filter((e) => e.examType === examType);
  }
  if (subject && subject !== "Toutes") {
    filtered = filtered.filter((e) => e.subject.toLowerCase() === subject.toLowerCase());
  }
  if (year && year !== "Toutes") {
    filtered = filtered.filter((e) => e.year === Number(year));
  }

  return NextResponse.json({
    success: true,
    data: {
      examTypes: ["Tous", "BEPC", "BAC D", "BAC C", "BAC A"],
      subjects: ["Toutes", "Mathématiques", "Physique-Chimie", "SVT", "Français", "Philosophie", "Histoire-Géo"],
      years: ["Toutes", "2025", "2024", "2023", "2022", "2021"],
      totalCount: filtered.length,
      exams: filtered,
    },
  });
}
