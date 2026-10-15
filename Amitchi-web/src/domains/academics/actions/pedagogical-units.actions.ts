"use server";

import { db } from "@/infrastructure/database";
import { pedagogicalUnits, pedagogicalUnitMembers, schoolSubjects, timetableEntries } from "@/infrastructure/database/schema/academics";
import { employees } from "@/infrastructure/database/schema/hr";
import { eq, and, sql, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { protectedDbAction } from "@/lib/protected-action";

/**
 * Helper to ensure the pedagogical unit tables exist in the database (Supabase/Postgres) dynamically.
 * This runs when listing the page to avoid needing to apply manually database migrations.
 */
async function ensureTablesExist() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pedagogical_units (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      subject_id INTEGER REFERENCES school_subjects(id) ON DELETE SET NULL,
      educational_level VARCHAR(100),
      lead_teacher_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pedagogical_unit_members (
      id SERIAL PRIMARY KEY,
      unit_id INTEGER REFERENCES pedagogical_units(id) ON DELETE CASCADE,
      employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
      joined_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

export async function getPedagogicalUnits() {
  return protectedDbAction("Academics", "canView", async () => {
    // 1. Ensure the tables exist
    await ensureTablesExist();

    // 2. Fetch the records with relations
    const units = await db.query.pedagogicalUnits.findMany({
      with: {
        subject: true,
        leadTeacher: true,
        members: {
          with: {
            teacher: true
          }
        }
      },
      orderBy: (units, { desc }) => [desc(units.createdAt)]
    });

    return units;
  });
}

export async function savePedagogicalUnit(id: number | null, data: any) {
  return protectedDbAction("Academics", "canEdit", async () => {
    await ensureTablesExist();

    const payload = {
      name: data.name,
      subjectId: data.subjectId ? Number(data.subjectId) : null,
      educationalLevel: data.educationalLevel || null,
      leadTeacherId: data.leadTeacherId ? Number(data.leadTeacherId) : null,
      description: data.description || null,
    };

    if (id) {
      await db.update(pedagogicalUnits).set(payload).where(eq(pedagogicalUnits.id, id));
    } else {
      await db.insert(pedagogicalUnits).values(payload);
    }

    revalidatePath("/dashboard/academics/pedagogical-units");
    return { success: true };
  });
}

export async function deletePedagogicalUnit(id: number) {
  return protectedDbAction("Academics", "canDelete", async () => {
    await ensureTablesExist();
    await db.delete(pedagogicalUnits).where(eq(pedagogicalUnits.id, id));
    revalidatePath("/dashboard/academics/pedagogical-units");
    return { success: true };
  });
}

export async function addTeacherToUnit(unitId: number, employeeId: number) {
  return protectedDbAction("Academics", "canEdit", async () => {
    await ensureTablesExist();

    // Check if already a member
    const existing = await db.query.pedagogicalUnitMembers.findFirst({
      where: and(
        eq(pedagogicalUnitMembers.unitId, unitId),
        eq(pedagogicalUnitMembers.employeeId, employeeId)
      )
    });

    if (!existing) {
      await db.insert(pedagogicalUnitMembers).values({
        unitId,
        employeeId
      });
    }

    revalidatePath("/dashboard/academics/pedagogical-units");
    return { success: true };
  });
}

export async function removeTeacherFromUnit(unitId: number, employeeId: number) {
  return protectedDbAction("Academics", "canEdit", async () => {
    await ensureTablesExist();
    await db.delete(pedagogicalUnitMembers).where(
      and(
        eq(pedagogicalUnitMembers.unitId, unitId),
        eq(pedagogicalUnitMembers.employeeId, employeeId)
      )
    );
    revalidatePath("/dashboard/academics/pedagogical-units");
    return { success: true };
  });
}

export async function getPedagogicalUnitTimetable(unitId: number) {
  return protectedDbAction("Academics", "canView", async () => {
    await ensureTablesExist();

    // 1. Get member teacher IDs
    const members = await db.query.pedagogicalUnitMembers.findMany({
      where: eq(pedagogicalUnitMembers.unitId, unitId)
    });
    
    const teacherIds = members.map(m => m.employeeId).filter(Boolean) as number[];
    if (teacherIds.length === 0) return [];

    // 2. Fetch all entries for these teachers
    const entries = await db.query.timetableEntries.findMany({
      where: inArray(timetableEntries.employeeId, teacherIds),
      with: {
        subject: true,
        teacher: true,
        class: true
      }
    });

    return entries;
  });
}
