import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  try {
    const result = await sql`SELECT id, school_id, num_admission, nom_etudiant FROM students WHERE num_admission = 'AH 2025-00001'`;
    console.log("Existing records:", result);
  } catch (err: any) {
    console.error(err);
  }
  process.exit(0);
}

main().catch(console.error);
