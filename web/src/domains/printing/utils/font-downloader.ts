import fs from "fs";
import path from "path";

const FONT_URL = "https://raw.githubusercontent.com/google/fonts/main/ofl/amiri/Amiri-Regular.ttf";

export async function downloadArabicFontIfNeeded() {
  const outputDir = path.join(process.cwd(), "src/domains/printing/utils");
  const outputFile = path.join(outputDir, "amiri-font.ts");

  if (fs.existsSync(outputFile)) {
    return;
  }

  console.log("Arabic font not found locally. Downloading from Google Fonts repository...");
  try {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const response = await fetch(FONT_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch font: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    
    const fileContent = `// This file is auto-generated. Do not edit manually.\nexport const amiriFontBase64 = "${base64}";\n`;
    fs.writeFileSync(outputFile, fileContent);
    console.log("Successfully downloaded and saved Arabic font base64!");
  } catch (err) {
    console.error("Failed to download Arabic font:", err);
  }
}
