const fs = require('fs');
const path = require('path');

const source = "C:/Users/User/.gemini/antigravity-ide/brain/b98175c3-f8c3-41ac-88b9-6e3cc392d319/media__1783163961210.jpg";
const dest = path.join(__dirname, '../public/salissou.jpg');

try {
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, dest);
    console.log("✅ Image copiée avec succès vers public/salissou.jpg !");
  } else {
    console.error("❌ Source image introuvable à : " + source);
  }
} catch (err) {
  console.error("❌ Erreur lors de la copie :", err);
}
