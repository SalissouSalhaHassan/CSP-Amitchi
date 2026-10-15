"use server";

import { db } from "@/infrastructure/database";
import { students } from "@/infrastructure/database/schema/students";
import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { protectedDbAction } from "@/lib/protected-action";

export interface PromotionData {
  studentIds: number[];
  targetClass: string;
  targetSession: string;
  transferBalance: boolean;
}

export async function promoteStudents(data: PromotionData) {
  const { studentIds, targetClass, targetSession, transferBalance } = data;

  if (studentIds.length === 0) {
    return { error: "Aucun étudiant sélectionné." };
  }

  return protectedDbAction("Students", "canEdit", async () => {
    // In a real scenario, we might want to update students one by one 
    // or use a transaction if we were doing more complex logic (like balance transfer)
    
    await db.update(students)
      .set({
        classe: targetClass,
        session: targetSession,
        // If transferBalance is true, we could logic here, but for now we just update class/session
      })
      .where(inArray(students.id, studentIds));

    revalidatePath("/dashboard/students");
    revalidatePath("/dashboard/students/promote");
    
    return { success: true, message: `${studentIds.length} étudiants ont été promus avec succès.` };
  });
}
