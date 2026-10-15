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

async function test() {
  try {
    const subsCols = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'lms_submissions'
    `;
    console.log("lms_submissions columns:", subsCols);

    const hwCols = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'homework'
    `;
    console.log("homework columns:", hwCols);

    // Let's create homework_submissions table if not exists
    await sql`
      CREATE TABLE IF NOT EXISTS homework_submissions (
        id SERIAL PRIMARY KEY,
        homework_id INTEGER REFERENCES homework(id) ON DELETE CASCADE,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        file_path TEXT,
        text_content TEXT,
        status VARCHAR(50) DEFAULT 'Soumis',
        score DOUBLE PRECISION,
        feedback TEXT,
        submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        graded_at TIMESTAMP WITH TIME ZONE,
        graded_by VARCHAR(255)
      )
    `;
    console.log("homework_submissions table ensured!");

  } catch (e) {
    console.error("Error:", e);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

test();
