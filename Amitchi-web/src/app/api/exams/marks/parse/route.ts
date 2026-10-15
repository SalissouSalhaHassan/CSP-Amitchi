import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { text, max_marks = 20 } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "Texte vide ou manquant." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const maxMark = parseFloat(max_marks);

    if (apiKey) {
      try {
        const prompt = `Tu es un assistant IA spécialisé dans l'analyse de texte académique.
Analyse le texte brut fourni pour extraire les notes des examens des élèves. Le texte contient des codes d'anonymat (par exemple 'C1-S45-SUB3-ABC') et les notes obtenues (des nombres).
La note maximale autorisée est de ${maxMark}.
Extrais chaque paire (code d'anonymat, note) et retourne uniquement un tableau JSON d'objets, sans balises markdown ni explications.
Chaque objet doit avoir exactement ces deux clés :
- "anonymity_code": (chaîne de caractères contenant le code d'anonymat trouvé)
- "mark": (nombre décimal représentant la note extraite)

Texte à analyser :
${text}`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: "application/json" }
            })
          }
        );

        if (response.ok) {
          const resJson = await response.json();
          let textContent = resJson.candidates?.[0]?.content?.parts?.[0]?.text || "";
          
          textContent = textContent.trim();
          if (textContent.startsWith("```json")) {
            textContent = textContent.substring(7);
          }
          if (textContent.endsWith("```")) {
            textContent = textContent.substring(0, textContent.length - 3);
          }
          textContent = textContent.trim();

          const data = JSON.parse(textContent);
          if (Array.isArray(data)) {
            // Filter out invalid items
            const filtered = data
              .filter((item: any) => item && typeof item.anonymity_code === "string" && !isNaN(parseFloat(item.mark)))
              .map((item: any) => ({
                anonymity_code: item.anonymity_code.trim(),
                mark: parseFloat(item.mark)
              }));
            return NextResponse.json({ status: "success", parsed: filtered, method: "AI (Gemini)" });
          }
        }
      } catch (geminiError) {
        console.warn("[Gemini Parsing Error] Falling back to Regex parsing:", geminiError);
      }
    }

    // Fallback Regex parser (Offline mode)
    const list: Array<{ anonymity_code: string; mark: number }> = [];
    const lines = text.split("\n");
    for (const line of lines) {
      // Look for anonymity codes containing alphanumeric/dash chars and a score
      const match = line.match(/([A-Z0-9\-]+)\s*[:=\-\s,;\t]+\s*([0-9]+(?:\.[0-9]+)?)/i);
      if (match) {
        const code = match[1].trim();
        const val = parseFloat(match[2]);
        if (code && !isNaN(val)) {
          list.push({ anonymity_code: code, mark: val });
        }
      }
    }

    return NextResponse.json({ status: "success", parsed: list, method: "Regex (Local Fallback)" });
  } catch (error: any) {
    console.error("Error parsing marks with AI:", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
}
