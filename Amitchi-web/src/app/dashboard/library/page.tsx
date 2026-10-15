export const dynamic = "force-dynamic";

import { getLibraryBooks, getLibraryIssues } from "@/domains/library/actions/library.actions";
import LibraryDashboardClient from "./LibraryDashboardClient";

export default async function LibraryPage() {
  const [booksRes, issuesRes] = await Promise.all([
    getLibraryBooks(),
    getLibraryIssues(),
  ]);

  const books = (booksRes as any).data?.data || (booksRes as any).data || [];
  const issues = (issuesRes as any).data?.data || (issuesRes as any).data || [];

  return <LibraryDashboardClient books={books} issues={issues} />;
}
