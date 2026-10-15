const postgres = require("postgres");
const fs = require("fs");
const path = require("path");

function getDbUrl() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const match = line.match(/^DATABASE_URL\s*=\s*(.+)$/);
      if (match) {
        return match[1].trim().replace(/^['"]|['"]$/g, "");
      }
    }
  }
  return process.env.DATABASE_URL;
}

const dbUrl = getDbUrl();
if (!dbUrl) {
  console.error("❌ DATABASE_URL not found!");
  process.exit(1);
}

const sql = postgres(dbUrl, { max: 1 });

async function run() {
  console.log("🚀 Ensuring Inventory, Assets, Suppliers & Stock Movement tables in PostgreSQL...");

  try {
    // 1. inventory_categories table
    await sql`
      CREATE TABLE IF NOT EXISTS inventory_categories (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        icon VARCHAR(50) DEFAULT 'Package',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`ALTER TABLE inventory_categories ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE;`;
    await sql`ALTER TABLE inventory_categories ADD COLUMN IF NOT EXISTS description TEXT;`;
    await sql`ALTER TABLE inventory_categories ADD COLUMN IF NOT EXISTS icon VARCHAR(50) DEFAULT 'Package';`;

    // 2. inventory_items table
    await sql`
      CREATE TABLE IF NOT EXISTS inventory_items (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        sku VARCHAR(100),
        category_id INTEGER REFERENCES inventory_categories(id) ON DELETE SET NULL,
        quantity INTEGER DEFAULT 0 NOT NULL,
        min_threshold INTEGER DEFAULT 5 NOT NULL,
        unit_price DOUBLE PRECISION DEFAULT 0,
        condition VARCHAR(50) DEFAULT 'Neuf',
        location VARCHAR(255) DEFAULT 'Magasin Principal',
        brand_model VARCHAR(150),
        serial_number VARCHAR(100),
        is_asset BOOLEAN DEFAULT FALSE,
        assigned_room VARCHAR(100),
        supplier_name VARCHAR(150),
        image_url TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE;`;
    await sql`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS min_threshold INTEGER DEFAULT 5;`;
    await sql`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS brand_model VARCHAR(150);`;
    await sql`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100);`;
    await sql`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS is_asset BOOLEAN DEFAULT FALSE;`;
    await sql`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS assigned_room VARCHAR(100);`;
    await sql`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(150);`;
    await sql`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS image_url TEXT;`;
    await sql`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS notes TEXT;`;

    // 3. inventory_stock_movements table
    await sql`
      CREATE TABLE IF NOT EXISTS inventory_stock_movements (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
        item_id INTEGER REFERENCES inventory_items(id) ON DELETE CASCADE NOT NULL,
        movement_type VARCHAR(50) NOT NULL,
        quantity INTEGER NOT NULL,
        unit_cost DOUBLE PRECISION DEFAULT 0,
        reference_doc VARCHAR(100),
        performed_by VARCHAR(150) DEFAULT 'Gestionnaire de Stock',
        notes TEXT,
        movement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `;

    // 4. inventory_assignments table
    await sql`
      CREATE TABLE IF NOT EXISTS inventory_assignments (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
        item_id INTEGER REFERENCES inventory_items(id) ON DELETE CASCADE NOT NULL,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
        assigned_qty INTEGER DEFAULT 1 NOT NULL,
        assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        expected_return_date TIMESTAMP,
        actual_return_date TIMESTAMP,
        condition_at_assignment VARCHAR(50) DEFAULT 'Bon état',
        condition_at_return VARCHAR(50),
        status VARCHAR(50) DEFAULT 'En possession',
        notes TEXT,
        assigned_by VARCHAR(150) DEFAULT 'Intendant'
      );
    `;

    await sql`ALTER TABLE inventory_assignments ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE;`;
    await sql`ALTER TABLE inventory_assignments ADD COLUMN IF NOT EXISTS expected_return_date TIMESTAMP;`;
    await sql`ALTER TABLE inventory_assignments ADD COLUMN IF NOT EXISTS actual_return_date TIMESTAMP;`;
    await sql`ALTER TABLE inventory_assignments ADD COLUMN IF NOT EXISTS condition_at_assignment VARCHAR(50) DEFAULT 'Bon état';`;
    await sql`ALTER TABLE inventory_assignments ADD COLUMN IF NOT EXISTS condition_at_return VARCHAR(50);`;
    await sql`ALTER TABLE inventory_assignments ADD COLUMN IF NOT EXISTS notes TEXT;`;
    await sql`ALTER TABLE inventory_assignments ADD COLUMN IF NOT EXISTS assigned_by VARCHAR(150) DEFAULT 'Intendant';`;

    // 5. inventory_suppliers table
    await sql`
      CREATE TABLE IF NOT EXISTS inventory_suppliers (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL,
        contact_person VARCHAR(100),
        phone VARCHAR(50),
        email VARCHAR(100),
        address TEXT,
        category VARCHAR(100) DEFAULT 'Fournitures',
        tax_id VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 6. inventory_purchase_orders table
    await sql`
      CREATE TABLE IF NOT EXISTS inventory_purchase_orders (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
        order_number VARCHAR(100) NOT NULL UNIQUE,
        supplier_id INTEGER REFERENCES inventory_suppliers(id) ON DELETE SET NULL,
        order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        expected_delivery_date TIMESTAMP,
        total_amount DOUBLE PRECISION DEFAULT 0 NOT NULL,
        status VARCHAR(50) DEFAULT 'Commandé',
        items_json TEXT,
        approved_by VARCHAR(150) DEFAULT 'Direction',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Indexes
    await sql`CREATE INDEX IF NOT EXISTS inventory_categories_school_id_idx ON inventory_categories(school_id);`;
    await sql`CREATE INDEX IF NOT EXISTS inventory_items_school_id_idx ON inventory_items(school_id);`;
    await sql`CREATE INDEX IF NOT EXISTS inventory_items_category_idx ON inventory_items(category_id);`;
    await sql`CREATE INDEX IF NOT EXISTS inventory_items_sku_idx ON inventory_items(sku);`;
    await sql`CREATE INDEX IF NOT EXISTS inventory_stock_movements_school_id_idx ON inventory_stock_movements(school_id);`;
    await sql`CREATE INDEX IF NOT EXISTS inventory_stock_movements_item_id_idx ON inventory_stock_movements(item_id);`;
    await sql`CREATE INDEX IF NOT EXISTS inventory_stock_movements_date_idx ON inventory_stock_movements(movement_date);`;
    await sql`CREATE INDEX IF NOT EXISTS inventory_assignments_school_id_idx ON inventory_assignments(school_id);`;
    await sql`CREATE INDEX IF NOT EXISTS inventory_assignments_item_id_idx ON inventory_assignments(item_id);`;
    await sql`CREATE INDEX IF NOT EXISTS inventory_assignments_employee_id_idx ON inventory_assignments(employee_id);`;
    await sql`CREATE INDEX IF NOT EXISTS inventory_suppliers_school_id_idx ON inventory_suppliers(school_id);`;
    await sql`CREATE INDEX IF NOT EXISTS inventory_purchase_orders_school_id_idx ON inventory_purchase_orders(school_id);`;
    await sql`CREATE INDEX IF NOT EXISTS inventory_purchase_orders_supplier_id_idx ON inventory_purchase_orders(supplier_id);`;

    console.log("✅ Inventory & Procurement tables successfully ensured in PostgreSQL!");
  } catch (err) {
    console.error("❌ Inventory migration error:", err);
  } finally {
    await sql.end();
  }
}

run();
