ALTER TABLE "library_books" ADD COLUMN IF NOT EXISTS "file_url" varchar(500);
ALTER TABLE "library_books" ADD COLUMN IF NOT EXISTS "file_type" varchar(50) DEFAULT 'PDF';
ALTER TABLE "library_books" ADD COLUMN IF NOT EXISTS "is_digital" text DEFAULT 'false';
ALTER TABLE "library_books" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "library_books" ADD COLUMN IF NOT EXISTS "school_id" integer;
ALTER TABLE "library_issues" ADD COLUMN IF NOT EXISTS "school_id" integer;
