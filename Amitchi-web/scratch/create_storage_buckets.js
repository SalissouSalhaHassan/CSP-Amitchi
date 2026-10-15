const postgres = require("postgres");

const NEW_URL = "postgresql://postgres.ntlncvstzmfqbqystpwi:salissou1994S@aws-0-us-west-1.pooler.supabase.com:6543/postgres";

async function createBuckets() {
  const sql = postgres(NEW_URL, { ssl: "require", connect_timeout: 10 });
  try {
    console.log("Creating buckets in new database...");

    // 1. Insert 'student-photos' bucket
    await sql`
      INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      VALUES ('student-photos', 'student-photos', true, null, null)
      ON CONFLICT (id) DO UPDATE 
      SET public = true, file_size_limit = null;
    `;
    console.log("✅ Bucket 'student-photos' created/verified.");

    // 2. Insert 'uploads' bucket
    await sql`
      INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      VALUES ('uploads', 'uploads', false, 52428800, null)
      ON CONFLICT (id) DO UPDATE 
      SET public = false, file_size_limit = 52428800;
    `;
    console.log("✅ Bucket 'uploads' created/verified.");

    // 3. Create RLS policies for storage.objects for 'student-photos'
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow public select student-photos'
        ) THEN
          CREATE POLICY "Allow public select student-photos" ON storage.objects
          FOR SELECT TO public
          USING (bucket_id = 'student-photos');
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow public insert student-photos'
        ) THEN
          CREATE POLICY "Allow public insert student-photos" ON storage.objects
          FOR INSERT TO public
          WITH CHECK (bucket_id = 'student-photos');
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow public update student-photos'
        ) THEN
          CREATE POLICY "Allow public update student-photos" ON storage.objects
          FOR UPDATE TO public
          USING (bucket_id = 'student-photos');
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow public delete student-photos'
        ) THEN
          CREATE POLICY "Allow public delete student-photos" ON storage.objects
          FOR DELETE TO public
          USING (bucket_id = 'student-photos');
        END IF;
      END $$;
    `;
    console.log("✅ Storage RLS policies created/verified.");

    const verified = await sql`SELECT id, name, public FROM storage.buckets`;
    console.log("VERIFIED BUCKETS IN NEW DB:", verified);
  } catch (err) {
    console.error("Error creating buckets:", err);
  } finally {
    await sql.end();
  }
}

createBuckets();
