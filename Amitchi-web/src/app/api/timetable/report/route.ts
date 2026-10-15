import { NextResponse } from "next/server";
import { getTimetableReportData } from "@/domains/academics/actions/timetable.actions";

export async function GET() {
  const res = await getTimetableReportData();
  if (!res.success) {
    return NextResponse.json({ error: res.error }, { status: 500 });
  }
  return NextResponse.json(res.data);
}
