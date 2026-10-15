import { NextRequest, NextResponse } from "next/server";
import { db } from "@/infrastructure/database";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const result = await db.execute(sql`
      SELECT id, nom, telephone, email 
      FROM employees 
      WHERE statut = 'Actif'
      ORDER BY nom ASC
    `);
    const rows = (Array.isArray(result) ? result : (result as any).rows || []) as any[];

    const formattedTeachers = rows.map((row: any) => ({
      id: row.id,
      nom: row.nom,
      telephone: row.telephone || "",
      email: row.email || ""
    }));

    return NextResponse.json(formattedTeachers);
  } catch (error: any) {
    console.error("Error fetching teachers:", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
}
