const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = (match[2] || '').trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    envVars[match[1]] = val;
  }
}

const postgres = require(path.join(__dirname, '..', 'node_modules', 'postgres'));
const connectionString = envVars.REMOTE_DATABASE_URL || envVars.DATABASE_URL;
const sql = postgres(connectionString, { ssl: 'require' });

function computeScoreOn20(row) {
  const weighted = row.weighted_score !== null && row.weighted_score !== undefined ? Number(row.weighted_score) : null;
  const coef = Math.max(1, Number(row.coefficient || 1));
  const total = row.total_score !== null && row.total_score !== undefined ? Number(row.total_score) : null;
  const classWork = row.class_work_score !== null && row.class_work_score !== undefined ? Number(row.class_work_score) : null;
  const exam = row.exam_score !== null && row.exam_score !== undefined ? Number(row.exam_score) : null;
  const moyDev = row.moyenne_devoirs !== null && row.moyenne_devoirs !== undefined ? Number(row.moyenne_devoirs) : null;

  // 1. If weighted_score and coefficient exist and are consistent
  if (weighted !== null && weighted > 0 && coef > 0) {
    const fromWeighted = weighted / coef;
    if (fromWeighted <= 20.0) {
      return Number(fromWeighted.toFixed(2));
    }
  }

  // 2. If both classWork/moyDev and exam exist
  const cw = (moyDev !== null && moyDev > 0) ? moyDev : ((classWork !== null && classWork > 0) ? classWork : null);
  if (cw !== null && exam !== null && exam > 0) {
    if (cw <= 20.0 && exam <= 20.0) {
      return Number(((cw + exam) / 2.0).toFixed(2));
    }
  }

  // 3. From total_score
  if (total !== null && total > 0) {
    if (total <= 20.0) {
      if (classWork !== null && exam !== null && Math.abs((classWork + exam) - total) < 0.1 && (classWork + exam) > 0) {
        return Number(((classWork + exam) / 2.0).toFixed(2));
      }
      return Number(total.toFixed(2));
    } else if (total <= 40.0) {
      return Number((total / 2.0).toFixed(2));
    } else if (total <= 100.0) {
      return Number(((total / 100.0) * 20.0).toFixed(2));
    } else if (coef > 1 && (total / coef) <= 20.0) {
      return Number((total / coef).toFixed(2));
    }
  }

  // 4. Fallback to exam or classWork
  if (exam !== null && exam > 0) {
    return Number((exam <= 20.0 ? exam : (exam / 100.0) * 20.0).toFixed(2));
  }
  if (cw !== null && cw > 0) {
    return Number((cw <= 20.0 ? cw : (cw / 100.0) * 20.0).toFixed(2));
  }

  return 0;
}

async function main() {
  try {
    const students = [344, 341, 342, 343, 345, 346, 413, 415];
    for (const studentId of students) {
      const stRow = await sql`SELECT nom_etudiant, classe FROM students WHERE id = ${studentId}`;
      if (!stRow.length) continue;
      const st = stRow[0];

      const grades = await sql`
        SELECT r.*, s.subject_name
        FROM student_results r
        LEFT JOIN school_subjects s ON r.subject_id = s.id
        WHERE r.student_id = ${studentId}
        ORDER BY r.term DESC, r.subject_id
      `;

      console.log(`\n=================== STUDENT #${studentId}: ${st.nom_etudiant} (${st.classe}) ===================`);
      
      // Group by latest term / semester or all terms
      const termMap = new Map();
      for (const g of grades) {
        const term = g.term || 'General';
        if (!termMap.has(term)) termMap.set(term, []);
        termMap.get(term).push(g);
      }

      for (const [term, list] of termMap.entries()) {
        console.log(`--- Term: ${term} ---`);
        let totalPts = 0;
        let totalCoef = 0;
        const atRisk = [];
        for (const g of list) {
          const score = computeScoreOn20(g);
          const coef = Math.max(1, Number(g.coefficient || 1));
          totalPts += score * coef;
          totalCoef += coef;
          const status = score < 10 ? '⚠️ AT RISK' : '✅ OK';
          console.log(`  ${g.subject_name}: ${score}/20 (coef ${coef}) [raw total=${g.total_score}, weighted=${g.weighted_score}] -> ${status}`);
          if (score < 10 && score > 0) {
            atRisk.push({ subject: g.subject_name, score });
          }
        }
        const avg = totalCoef > 0 ? (totalPts / totalCoef).toFixed(2) : 'N/A';
        console.log(`  => MOYENNE DU TRIMESTRE: ${avg}/20 | Matières à risque: ${atRisk.length}`);
      }
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
