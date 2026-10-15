const VERCEL_API_URL = "https://api.vercel.com";

interface VercelResponse {
  success: boolean;
  error?: string;
  verification?: any;
}

/**
 * Enregistrer un domaine personnalisé sur le projet Vercel
 */
export async function addDomainToVercel(domain: string): Promise<VercelResponse> {
  const projectId = process.env.VERCEL_PROJECT_ID;
  const token = process.env.VERCEL_API_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!projectId || !token) {
    console.warn("[Vercel Service] VERCEL_PROJECT_ID or VERCEL_API_TOKEN is missing. Bypassing Vercel domain addition (domain will only be saved in database).");
    return { success: true };
  }

  const url = `${VERCEL_API_URL}/v9/projects/${projectId}/domains${teamId ? `?teamId=${teamId}` : ""}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: domain }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error?.message || "Échec de l'ajout sur Vercel." };
    }

    return { success: true, verification: data.verification };
  } catch (error: any) {
    return { success: false, error: error.message || "Erreur réseau." };
  }
}

/**
 * Supprimer un domaine de Vercel
 */
export async function removeDomainFromVercel(domain: string): Promise<VercelResponse> {
  const projectId = process.env.VERCEL_PROJECT_ID;
  const token = process.env.VERCEL_API_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!projectId || !token) {
    console.warn("[Vercel Service] VERCEL_PROJECT_ID or VERCEL_API_TOKEN is missing. Bypassing Vercel domain removal (domain will only be removed from database).");
    return { success: true };
  }

  const url = `${VERCEL_API_URL}/v9/projects/${projectId}/domains/${domain}${teamId ? `?teamId=${teamId}` : ""}`;

  try {
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error?.message || "Échec de la suppression." };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Erreur réseau." };
  }
}
