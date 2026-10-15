import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

// Align this exactly with the updated rbac.ts getCompatibleLevels
function getCompatibleLevels(level: string): string[] {
  const norm = level.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  
  // PRIMARY
  if (["primaire", "maternelle", "elementaire", "ابتدائي", "الابتدائي", "الابتدائيه"].includes(norm)) {
    return ["Primaire", "Maternelle", "primaire", "maternelle", "Elémentaire", "elementaire", "Tous", "All", "tous", "all", ""];
  }
  // MIDDLE / COLLÈGE
  if (["college", "moyen", "middle", "cem", "college general", "premier cycle", "إعدادي", "الإعدادية", "اعدادي", "متوسط", "المتوسط", "متوسطه", "المتوسطه"].includes(norm)) {
    return ["Collège", "College", "collège", "college", "Moyen", "moyen", "Collège Général", "college general", "Premier Cycle", "premier cycle", "Tous", "All", "tous", "all", ""];
  }
  // SECONDARY / LYCÉE
  if (["lycee", "secondaire", "high school", "second cycle", "ثانوي", "ثانويه", "الثانوي", "الثانويه"].includes(norm)) {
    return ["Lycée", "Lycee", "lycée", "lycee", "Secondaire", "secondaire", "Second Cycle", "second cycle", "Tous", "All", "tous", "all", ""];
  }
  // UNIVERSITY
  if (["university", "universite", "licence", "master", "doctorat", "superieur", "جامعه", "الجامعه", "جامعي", "عالي"].includes(norm)) {
    return ["Université", "Universite", "Licence", "Master", "université", "universite", "licence", "master", "Supérieur", "superieur", "Tous", "All", "tous", "all", ""];
  }
  return [level, level.toLowerCase(), level.toUpperCase(), "Tous", "All", "tous", "all", ""];
}

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  try {
    console.log("=== SIMULATING getStudents() WITH UPDATED COMPATIBILITY RULES ===");
    
    const users = await sql`
      SELECT u.id, u.utilisateur, u.nom_prenom, u.school_id, u.admin, u.super_admin, u.educational_level, r.role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
    `;

    const students = await sql`
      SELECT id, school_id, num_admission, nom_etudiant, educational_level, classe, statut FROM students
    `;
    console.log(`Total students in DB: ${students.length}`);

    for (const user of users) {
      console.log(`\n--------------------------------------------------`);
      console.log(`User: ${user.utilisateur} | School ID: ${user.school_id} | Level: ${user.educational_level} | Role: ${user.role_name}`);
      
      const schoolId = user.school_id;
      if (!schoolId && !user.super_admin) {
        console.log("Result: Access denied (No school ID)");
        continue;
      }

      // Determine roleType
      let roleType = "regular_user";
      if (user.super_admin === true || user.super_admin === 1) {
        roleType = "super_admin";
      } else {
        const norm = (user.role_name || "").toLowerCase().trim();
        const hasRestrictedLevel = !(user.educational_level === "Tous" || user.educational_level === "All" || user.educational_level === "tous" || !user.educational_level);
        
        if (norm.includes("super_admin") || norm.includes("super admin")) {
          roleType = "super_admin";
        } else if (norm.includes("directeur") || norm.includes("dirigeant")) {
          roleType = hasRestrictedLevel ? "level_director" : "directeur";
        } else if (user.admin === true) {
          roleType = hasRestrictedLevel ? "level_director" : "general_director";
        }
      }

      console.log(`Computed RoleType: ${roleType}`);

      // Run query filtering logic
      let visible = [];
      if (roleType === "super_admin") {
        visible = students; // Sees everything
      } else {
        // Filter by school
        let filtered = students.filter(s => Number(s.school_id) === Number(schoolId));
        
        if (roleType === "level_director") {
          const activeLevel = user.educational_level;
          if (activeLevel) {
            const compatible = getCompatibleLevels(activeLevel);
            filtered = filtered.filter(s => compatible.includes(s.educational_level));
          } else {
            filtered = [];
          }
        }
        visible = filtered;
      }

      console.log(`Visible Students count: ${visible.length}`);
      console.log(visible.map(s => `${s.nom_etudiant} (${s.educational_level})`).slice(0, 10));
      if (visible.length > 10) console.log(`... and ${visible.length - 10} more items`);
    }

  } catch (err: any) {
    console.error("❌ Error in simulation:", err.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
