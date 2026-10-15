import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db, readDb } from "@/infrastructure/database";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { verifyParentChildRelationship } from "../../_lib/family-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get("action");

  if (!action) {
    return mobileJsonError("Action manquante", 400);
  }

  try {
    if (action === "getLibraryBooks") {
      // Query library_books if exists, else return empty
      try {
        const books = await db.execute(sql`SELECT * FROM library_books ORDER BY created_at DESC`);
        return NextResponse.json({ success: true, data: (books as any) || [] });
      } catch (err) {
        return NextResponse.json({ success: true, data: [] });
      }
    }

    if (action === "getStudentLibraryIssues") {
      const studentId = Number(searchParams.get("studentId"));
      if (!studentId) {
        return mobileJsonError("studentId manquant", 400);
      }

      const isLinked = await verifyParentChildRelationship(user, studentId);
      if (!isLinked) {
        return mobileJsonError("Accès refusé.", 403);
      }

      try {
        const issues = await db.execute(sql`
          SELECT li.id, li.book_id, li.student_id, li.issue_date, li.due_date, li.return_date, li.status, li.fine_amount,
                 lb.title, lb.author, lb.category
          FROM library_issues li
          LEFT JOIN library_books lb ON li.book_id = lb.id
          WHERE li.student_id = ${studentId}
          ORDER BY li.issue_date DESC
        `);

        const data = ((issues as any) || []).map((row: any) => ({
          id: row.id,
          book_id: row.book_id,
          student_id: row.student_id,
          issue_date: row.issue_date,
          due_date: row.due_date,
          return_date: row.return_date,
          status: row.status,
          fine_amount: row.fine_amount,
          library_books: {
            title: row.title,
            author: row.author,
            category: row.category,
          }
        }));

        return NextResponse.json({ success: true, data });
      } catch (err) {
        return NextResponse.json({ success: true, data: [] });
      }
    }

    return mobileJsonError("Action inconnue", 400);
  } catch (err: any) {
    return mobileJsonError(`Erreur: ${err.message || err}`, 500);
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const body = await request.json();
    const { action, payload } = body;

    if (action !== "reserveBook" || !payload) {
      return mobileJsonError("Action non supportée", 400);
    }

    const { bookId, studentId } = payload;
    if (!bookId || !studentId) {
      return mobileJsonError("Paramètres manquants", 400);
    }

    const isLinked = await verifyParentChildRelationship(user, studentId);
    if (!isLinked) {
      return mobileJsonError("Accès refusé.", 403);
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);

    try {
      await db.execute(sql`
        INSERT INTO library_issues (book_id, student_id, due_date, status, fine_amount)
        VALUES (${bookId}, ${studentId}, ${dueDate.toISOString()}, 'Reservation', '0')
      `);
      return NextResponse.json({ success: true });
    } catch (err: any) {
      return mobileJsonError(`Erreur reservation: ${err.message || err}`, 500);
    }
  } catch (err: any) {
    return mobileJsonError(`Erreur: ${err.message || err}`, 500);
  }
}
