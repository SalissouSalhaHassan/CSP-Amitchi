import { NextRequest, NextResponse } from "next/server";
import { db } from "@/infrastructure/database";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { campaignId: campaignIdStr } = await params;
    const campaignId = parseInt(campaignIdStr);

    if (isNaN(campaignId)) {
      return NextResponse.json({ error: "campaignId invalide." }, { status: 400 });
    }

    const result = await db.execute(sql`
      SELECT 
        t.id,
        t.campaign_id,
        t.class_id,
        c.class_name,
        t.subject_id,
        s.subject_name,
        t.exam_date,
        t.start_time,
        t.end_time,
        t.max_marks
      FROM exam_timetables t
      LEFT JOIN school_classes c ON t.class_id = c.id
      LEFT JOIN school_subjects s ON t.subject_id = s.id
      WHERE t.campaign_id = ${campaignId}
      ORDER BY t.exam_date ASC, t.start_time ASC
    `);

    const rows = (Array.isArray(result) ? result : (result as any).rows || []) as any[];

    const formatted = rows.map((row: any) => {
      const formatDate = (dateVal: any) => {
        if (!dateVal) return "";
        const d = new Date(dateVal);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
      };

      return {
        id: row.id,
        campaign_id: row.campaign_id,
        class_id: row.class_id,
        class_name: row.class_name || "N/A",
        subject_id: row.subject_id,
        subject_name: row.subject_name || "N/A",
        exam_date: formatDate(row.exam_date),
        start_time: row.start_time || "",
        end_time: row.end_time || "",
        max_marks: row.max_marks || 20
      };
    });

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("Error fetching timetable:", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
}
