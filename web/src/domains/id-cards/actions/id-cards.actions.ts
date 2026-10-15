"use server";

import { db } from "@/infrastructure/database";
import { students } from "@/infrastructure/database/schema/students";
import { inArray } from "drizzle-orm";
import { protectedDbAction } from "@/lib/protected-action";

export async function getStudentsForIdCards(ids: number[]) {
  return protectedDbAction("FrontOffice", "canView", async () => {
    const data = await db.query.students.findMany({
      where: inArray(students.id, ids)
    });
    return { data };
  });
}
