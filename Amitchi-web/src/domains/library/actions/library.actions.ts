"use server";

import { db } from "@/infrastructure/database";
import { libraryBooks, libraryIssues } from "@/infrastructure/database/schema/library";
import { eq, desc, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { libraryBookSchema, libraryIssueSchema, LibraryBookFormData, LibraryIssueFormData } from "../validators/library.schema";
import { protectedDbAction } from "@/lib/protected-action";
import { getActiveSchoolId } from "@/domains/auth/services/school";

// --- Self-healing Schema Migration for Library Books ---
let librarySchemaEnsured = false;
export async function ensureLibrarySchema() {
  if (librarySchemaEnsured) return;
  try {
    const alterStatements = [
      "ALTER TABLE library_books ADD COLUMN IF NOT EXISTS school_id INTEGER",
      "ALTER TABLE library_books ADD COLUMN IF NOT EXISTS file_url VARCHAR(500)",
      "ALTER TABLE library_books ADD COLUMN IF NOT EXISTS file_type VARCHAR(50) DEFAULT 'PDF'",
      "ALTER TABLE library_books ADD COLUMN IF NOT EXISTS is_digital TEXT DEFAULT 'false'",
      "ALTER TABLE library_books ADD COLUMN IF NOT EXISTS description TEXT",
      "ALTER TABLE library_issues ADD COLUMN IF NOT EXISTS school_id INTEGER",
    ];
    for (const q of alterStatements) {
      try {
        await db.execute(sql.raw(q));
      } catch (_) {}
    }
    librarySchemaEnsured = true;
  } catch (_) {}
}

// --- Books ---
export async function getLibraryBooks() {
  return protectedDbAction("Library", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { data: [] };
    await ensureLibrarySchema();
    const data = await db.query.libraryBooks.findMany({
      where: eq(libraryBooks.schoolId, schoolId),
      orderBy: [desc(libraryBooks.createdAt)],
    });
    return { data };
  });
}

export async function createLibraryBook(formData: LibraryBookFormData) {
  const validation = libraryBookSchema.safeParse(formData);
  if (!validation.success) {
    return { error: validation.error.issues[0]?.message || "Erreur de validation" };
  }

  return protectedDbAction("Library", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Aucun contexte d'école trouvé." };
    await ensureLibrarySchema();

    try {
      await db.insert(libraryBooks).values({
        ...validation.data,
        schoolId,
        availableQuantity: validation.data.totalQuantity,
      });
    } catch (err: any) {
      // Direct SQL fallback if schema was just updated
      librarySchemaEnsured = false;
      await ensureLibrarySchema();
      await db.execute(sql`
        INSERT INTO library_books (
          school_id, title, author, isbn, category, total_quantity, available_quantity, shelf_location, file_url, file_type, is_digital, description
        ) VALUES (
          ${schoolId},
          ${validation.data.title},
          ${validation.data.author || null},
          ${validation.data.isbn || null},
          ${validation.data.category || null},
          ${validation.data.totalQuantity || 1},
          ${validation.data.totalQuantity || 1},
          ${validation.data.shelfLocation || null},
          ${validation.data.fileUrl || null},
          ${validation.data.fileType || 'PDF'},
          ${validation.data.isDigital || 'false'},
          ${validation.data.description || null}
        )
      `);
    }

    revalidatePath("/dashboard/library");
    return { success: true };
  });
}

export async function updateLibraryBook(id: number, formData: LibraryBookFormData) {
  const validation = libraryBookSchema.safeParse(formData);
  if (!validation.success) {
    return { error: validation.error.issues[0]?.message || "Erreur de validation" };
  }

  return protectedDbAction("Library", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Aucun contexte d'école trouvé." };
    await ensureLibrarySchema();
    const book = await db.query.libraryBooks.findFirst({ where: and(eq(libraryBooks.id, id), eq(libraryBooks.schoolId, schoolId)) });
    if (!book) throw new Error("Livre non trouvé");

    const diff = validation.data.totalQuantity - book.totalQuantity;
    
    await db.update(libraryBooks)
      .set({
        ...validation.data,
        schoolId,
        availableQuantity: book.availableQuantity + diff,
      })
      .where(and(eq(libraryBooks.id, id), eq(libraryBooks.schoolId, schoolId)));
    revalidatePath("/dashboard/library");
    return { success: true };
  });
}

export async function deleteLibraryBook(id: number) {
  return protectedDbAction("Library", "canDelete", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Aucun contexte d'école trouvé." };
    await db.delete(libraryBooks).where(and(eq(libraryBooks.id, id), eq(libraryBooks.schoolId, schoolId)));
    revalidatePath("/dashboard/library");
    return { success: true };
  });
}

// --- Issues ---
export async function getLibraryIssues() {
  return protectedDbAction("Library", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { data: [] };
    const data = await db.query.libraryIssues.findMany({
      where: eq(libraryIssues.schoolId, schoolId),
      with: {
        book: true,
        student: true,
        employee: true,
      },
      orderBy: [desc(libraryIssues.issueDate)],
    });
    return { data };
  });
}

export async function issueLibraryBook(formData: LibraryIssueFormData) {
  const validation = libraryIssueSchema.safeParse(formData);
  if (!validation.success) {
    return { error: validation.error.issues[0]?.message || "Erreur de validation" };
  }

  return protectedDbAction("Library", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Aucun contexte d'école trouvé." };
    // 1. Check availability
    const book = await db.query.libraryBooks.findFirst({
      where: and(eq(libraryBooks.id, validation.data.bookId), eq(libraryBooks.schoolId, schoolId)),
    });

    if (!book || book.availableQuantity <= 0) {
      throw new Error("Livre non disponible pour le moment.");
    }

    // 2. Create issue
    await db.insert(libraryIssues).values({
      ...validation.data,
      schoolId,
      dueDate: new Date(validation.data.dueDate),
      status: "En cours",
    });

    // 3. Update availability
    await db.update(libraryBooks)
      .set({ availableQuantity: book.availableQuantity - 1 })
      .where(and(eq(libraryBooks.id, validation.data.bookId), eq(libraryBooks.schoolId, schoolId)));

    revalidatePath("/dashboard/library");
    return { success: true };
  });
}

export async function returnLibraryBook(issueId: number, fineAmount: number = 0) {
  return protectedDbAction("Library", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Aucun contexte d'école trouvé." };
    const issue = await db.query.libraryIssues.findFirst({
      where: and(eq(libraryIssues.id, issueId), eq(libraryIssues.schoolId, schoolId)),
    });

    if (!issue || issue.status === "Retourné") {
      throw new Error("Emprunt non trouvé ou déjà retourné.");
    }

    // 1. Update issue
    await db.update(libraryIssues)
      .set({
        status: "Retourné",
        returnDate: new Date(),
        fineAmount: fineAmount.toString(),
      })
      .where(and(eq(libraryIssues.id, issueId), eq(libraryIssues.schoolId, schoolId)));

    // 2. Update book availability
    const book = await db.query.libraryBooks.findFirst({
      where: and(eq(libraryBooks.id, issue.bookId!), eq(libraryBooks.schoolId, schoolId)),
    });

    if (book) {
      await db.update(libraryBooks)
        .set({ availableQuantity: book.availableQuantity + 1 })
        .where(and(eq(libraryBooks.id, book.id), eq(libraryBooks.schoolId, schoolId)));
    }

    revalidatePath("/dashboard/library");
    return { success: true };
  });
}

export async function seedSampleLibraryResources() {
  return protectedDbAction("Library", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Aucun contexte d'école trouvé." };
    await ensureLibrarySchema();

    const samples = [
      {
        title: "Droit Constitutionnel & Institutions Politiques",
        author: "Pr. Mamadou Traoré",
        isbn: "978-2-8418-0112-4",
        category: "Sciences Juridiques & Politiques",
        totalQuantity: 9999,
        shelfLocation: "Biblio-Num / Cloud",
        fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        fileType: "PDF",
        isDigital: "true",
        description: "Manuel de référence traitant des régimes politiques, du contrôle de constitutionnalité et de l'histoire des institutions en Afrique de l'Ouest.",
      },
      {
        title: "Algorithmique, Structures de Données & Python Avancé",
        author: "Dr. Ousmane Bello",
        isbn: "978-2-1007-8891-2",
        category: "Informatique & IA",
        totalQuantity: 9999,
        shelfLocation: "Biblio-Num / Informatique",
        fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        fileType: "PDF",
        isDigital: "true",
        description: "Concepts fondamentaux de complexité algorithmique, POO, arbres binaires, graphes et introduction au Machine Learning.",
      },
      {
        title: "Mathématiques Générales : Analyse & Algèbre Linéaire",
        author: "Pr. Idrissa Diallo",
        isbn: "978-2-7298-5431-8",
        category: "Mathématiques",
        totalQuantity: 8,
        shelfLocation: "Rayon B2 - Étagère 4",
        fileUrl: null,
        fileType: "PDF",
        isDigital: "false",
        description: "Cours complet avec 150 exercices corrigés. Espaces vectoriels, calcul matriciel, intégrales multiples et séries entières.",
      },
      {
        title: "Histoire Générale de l'Afrique : Des Origines aux Indépendances",
        author: "Comité Scientifique UNESCO",
        isbn: "978-9-2320-1708-6",
        category: "Histoire & Sociologie",
        totalQuantity: 9999,
        shelfLocation: "Biblio-Num / Archives",
        fileUrl: "https://unesdoc.unesco.org/ark:/48223/pf0000042698",
        fileType: "PDF",
        isDigital: "true",
        description: "Ouvrage de référence sur les civilisations sahélo-sahariennes, le commerce transsaharien et l'émancipation des peuples africains.",
      },
      {
        title: "Économie du Développement & Finances Publiques",
        author: "Dr. Aminata Touré",
        isbn: "978-2-3431-2900-5",
        category: "Économie & Gestion",
        totalQuantity: 5,
        shelfLocation: "Rayon C1 - Étagère 2",
        fileUrl: null,
        fileType: "PDF",
        isDigital: "false",
        description: "Politiques macroéconomiques, gestion budgétaire axée sur les résultats, fiscalité et convergence monétaire dans l'espace UEMOA.",
      },
      {
        title: "Anatomie & Physiologie Humaine Fondamentale",
        author: "Pr. K. Assane & Collège Médical",
        isbn: "978-2-2947-6540-1",
        category: "Médecine & Santé",
        totalQuantity: 9999,
        shelfLocation: "Biblio-Num / Santé",
        fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        fileType: "PDF",
        isDigital: "true",
        description: "Manuel illustré destiné aux étudiants en médecine, pharmacie et soins infirmiers. Systèmes circulatoire, respiratoire et immunitaire.",
      },
    ];

    for (const sample of samples) {
      await db.insert(libraryBooks).values({
        ...sample,
        schoolId,
        availableQuantity: sample.totalQuantity,
      });
    }

    revalidatePath("/dashboard/library");
    return { success: true, count: samples.length };
  });
}

