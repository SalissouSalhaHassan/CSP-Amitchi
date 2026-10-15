import { NextRequest, NextResponse } from "next/server";
import { db } from "@/infrastructure/database";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const result = await db.execute(sql`
      SELECT id, name, capacity 
      FROM exam_rooms 
      ORDER BY name ASC
    `);
    const rows = (Array.isArray(result) ? result : (result as any).rows || []) as any[];

    const formattedRooms = rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      capacity: row.capacity,
      description: ""
    }));

    return NextResponse.json(formattedRooms);
  } catch (error: any) {
    console.error("Error fetching rooms:", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, capacity } = await request.json();

    if (!name || !capacity) {
      return NextResponse.json({ error: "Nom et capacité requis." }, { status: 400 });
    }

    // Check if room already exists
    const checkResult = await db.execute(sql`
      SELECT id FROM exam_rooms WHERE name = ${name} LIMIT 1
    `);
    const checkRows = (Array.isArray(checkResult) ? checkResult : (checkResult as any).rows || []) as any[];
    if (checkRows.length > 0) {
      return NextResponse.json({ error: "Cette salle existe déjà." }, { status: 400 });
    }

    await db.execute(sql`
      INSERT INTO exam_rooms (name, capacity)
      VALUES (${name}, ${parseInt(capacity)})
    `);

    return NextResponse.json({ status: "success", message: "Salle ajoutée avec succès." });
  } catch (error: any) {
    console.error("Error saving room:", error);
    return NextResponse.json({ error: error.message || "Erreur lors de l'enregistrement." }, { status: 500 });
  }
}
