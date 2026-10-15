export const dynamic = "force-dynamic";

import { getExpenses, getExpenseCategories } from "@/domains/finance/actions/finance.actions";
import ExpensesClient from "./expenses-client";

export default async function ExpensesPage() {
  const [expensesRes, categoriesRes] = await Promise.all([
    getExpenses().catch(() => ({ data: [] })),
    getExpenseCategories().catch(() => ({ data: [] })),
  ]);

  const expensesList = (expensesRes?.data || []) as any[];
  const categoriesList = (categoriesRes?.data || []) as any[];

  return (
    <ExpensesClient
      initialExpenses={expensesList}
      categories={categoriesList}
    />
  );
}
