export type ActionResponse<T> = {
  data?: T;
  error?: string;
  success?: boolean;
};

/**
 * A wrapper for database actions that provides consistent error handling.
 * In development, it gracefully handles ANY database-related error
 * by simulating success to allow UI testing without a live database.
 */
export async function safeDbAction<T>(
  action: () => Promise<T>
): Promise<ActionResponse<T>> {
  try {
    const result = await action();
    
    if (result && typeof result === 'object' && ('data' in result || 'success' in result || 'error' in result)) {
      return { ...result, success: (result as any).success ?? true } as any;
    }
    
    return { data: result, success: true } as any;
  } catch (error: any) {
    // Manually check for Next.js redirect/not-found errors to avoid TypeError if the built-in functions are missing
    if (error?.digest?.startsWith('NEXT_REDIRECT') || error?.message === 'NEXT_REDIRECT' || error?.digest?.startsWith('NEXT_NOT_FOUND')) {
      throw error;
    }

    console.error("Database Action Error:", error);

    // If we're in development, we treat most errors as "Simulation Success"
    // to allow the user to test the UI flow (Dialogs closing, transitions, etc.)
    const isDev = process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_DEMO_MODE === "true";
    
    // We detect if it's a database-level error (Drizzle/Postgres)
    const isDbError = 
      error.message?.includes("query") || 
      error.message?.includes("sql") || 
      error.message?.includes("connect") ||
      error.message?.includes("PostgresError") ||
      error.name === "PostgresError";

    if (isDev && isDbError) {
      console.warn("⚠️ Database Issue Detected:", error);
      console.warn("⚠️ Database not reachable. Returning error for diagnostic feedback.");
      return { 
        success: false, 
        error: `Erreur base de données: ${error.message}` 
      };
    }

    // Friendly error messages for validation or business logic
    let message = error.message || "Une erreur est survenue lors de l'opération.";
    
    if (error.message?.includes("unique constraint")) {
      message = "Cet enregistrement existe déjà.";
    }

    return { error: message, success: false };
  }
}
