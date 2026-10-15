ALTER TABLE "transport_routes" ADD COLUMN IF NOT EXISTS "school_id" integer;
ALTER TABLE "transport_subscriptions" ADD COLUMN IF NOT EXISTS "school_id" integer;
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "school_id" integer;
ALTER TABLE "inventory_assignments" ADD COLUMN IF NOT EXISTS "school_id" integer;
ALTER TABLE "library_books" ADD COLUMN IF NOT EXISTS "school_id" integer;
ALTER TABLE "library_issues" ADD COLUMN IF NOT EXISTS "school_id" integer;
