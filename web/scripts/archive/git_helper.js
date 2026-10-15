const { execSync } = require("child_process");

const repoDir = "C:\\Users\\User\\Desktop\\Edut";

try {
  console.log("=== GIT STATUS ===");
  const status = execSync("git status", { cwd: repoDir, encoding: "utf8" });
  console.log(status);
} catch (err) {
  console.error("❌ Failed to run git:", err.message);
}
