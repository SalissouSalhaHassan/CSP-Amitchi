import { Metadata } from "next";
import { db, readDb } from "@/infrastructure/database";
import { students } from "@/infrastructure/database/schema/students";
import { universityPrograms } from "@/infrastructure/database/schema/academics";
import { desc } from "drizzle-orm";
import { EquivalencesClient } from "./equivalences-client";
import { getEquivalencesList } from "@/domains/academics/actions/lmd-equivalences.actions";

export const metadata: Metadata = {
  title: "Équivalences & Transferts ECTS • Mobilité Internationale | EDUT",
  description: "Commission d'équivalences, reconnaissance des crédits ECTS et passerelles académiques LMD",
};

export default async function EquivalencesPage() {
  const equivalencesRes = await getEquivalencesList();
  const initialEquivalences = equivalencesRes.success && equivalencesRes.data ? equivalencesRes.data : [];

  // Fetch students for selection
  const rawStudents = await (readDb || db)
    .select({
      id: students.id,
      nom: students.nomEtudiant,
      matricule: students.numAdmission,
    })
    .from(students)
    .orderBy(desc(students.id))
    .limit(100);

  const studentsList = rawStudents.map((s) => ({
    id: s.id,
    nom: s.nom,
    matricule: s.matricule || `EDUT-${s.id}`,
  }));

  // Fetch programs for selection
  const rawPrograms = await (readDb || db)
    .select({
      id: universityPrograms.id,
      name: universityPrograms.name,
      level: universityPrograms.degreeLevel,
    })
    .from(universityPrograms)
    .limit(50);

  const programsList = rawPrograms.length > 0 ? rawPrograms : [
    { id: 1, name: "Licence Générale Informatique", level: "Licence" },
    { id: 2, name: "Master Génie Logiciel & Cloud", level: "Master" },
    { id: 3, name: "Licence Sciences Économiques & Gestion", level: "Licence" },
  ];

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
      <EquivalencesClient
        initialEquivalences={initialEquivalences}
        studentsList={studentsList}
        programsList={programsList}
      />
    </div>
  );
}
