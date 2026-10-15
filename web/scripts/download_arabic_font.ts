import fs from "fs";
import path from "path";

const FONT_URL = "https://raw.githubusercontent.com/google/fonts/main/ofl/amiri/Amiri-Regular.ttf";
const OUTPUT_DIR = path.join(__dirname, "../src/domains/printing/utils");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "amiri-font.ts");

async function downloadFont() {
  console.log("Downloading Amiri font from:", FONT_URL);
  
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  try {
    const res = await fetch(FONT_URL);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    
    const fileContent = `// This file is auto-generated. Do not edit manually.\nexport const amiriFontBase64 = "${base64}";\n`;
    fs.writeFileSync(OUTPUT_FILE, fileContent);
    console.log(`Successfully downloaded ${buffer.byteLength} bytes and saved Base64 font to ${OUTPUT_FILE}`);
  } catch (err) {
    console.error("Error downloading font:", err);
  }
}

downloadFont();

