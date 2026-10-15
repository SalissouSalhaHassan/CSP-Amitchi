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
  console.log("🚀 Ensuring Canteen & Dietetics tables in PostgreSQL...");

  try {
    // 1. canteen_items table
    await sql`
      CREATE TABLE IF NOT EXISTS canteen_items (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL,
        code VARCHAR(50),
        price DOUBLE PRECISION NOT NULL,
        category VARCHAR(50) DEFAULT 'Plat',
        stock INTEGER DEFAULT 100,
        calories INTEGER,
        allergens TEXT,
        is_vegetarian BOOLEAN DEFAULT FALSE,
        is_halal BOOLEAN DEFAULT TRUE,
        image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Alter canteen_items if existing
    await sql`ALTER TABLE canteen_items ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE;`;
    await sql`ALTER TABLE canteen_items ADD COLUMN IF NOT EXISTS calories INTEGER;`;
    await sql`ALTER TABLE canteen_items ADD COLUMN IF NOT EXISTS allergens TEXT;`;
    await sql`ALTER TABLE canteen_items ADD COLUMN IF NOT EXISTS is_vegetarian BOOLEAN DEFAULT FALSE;`;
    await sql`ALTER TABLE canteen_items ADD COLUMN IF NOT EXISTS is_halal BOOLEAN DEFAULT TRUE;`;

    // 2. canteen_weekly_menu table
    await sql`
      CREATE TABLE IF NOT EXISTS canteen_weekly_menu (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
        week_start_date VARCHAR(20) NOT NULL,
        day_of_week VARCHAR(20) NOT NULL,
        meal_type VARCHAR(50) DEFAULT 'Déjeuner',
        starter_dish VARCHAR(150),
        main_dish VARCHAR(150) NOT NULL,
        side_dish VARCHAR(150),
        dessert VARCHAR(150),
        allergens TEXT,
        calories INTEGER DEFAULT 650,
        is_vegetarian BOOLEAN DEFAULT FALSE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 3. canteen_meal_subscriptions table
    await sql`
      CREATE TABLE IF NOT EXISTS canteen_meal_subscriptions (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE NOT NULL,
        plan_type VARCHAR(100) DEFAULT 'Demi-pension (Déjeuner)',
        monthly_price DOUBLE PRECISION DEFAULT 25000,
        special_diet VARCHAR(100) DEFAULT 'Normal',
        allergies_notice TEXT,
        parent_phone VARCHAR(50),
        parent_whatsapp VARCHAR(50),
        start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        end_date TIMESTAMP,
        status VARCHAR(20) DEFAULT 'Actif',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 4. student_wallets table
    await sql`
      CREATE TABLE IF NOT EXISTS student_wallets (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE NOT NULL UNIQUE,
        balance DOUBLE PRECISION DEFAULT 0 NOT NULL,
        daily_spending_limit DOUBLE PRECISION DEFAULT 2000,
        is_locked BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`ALTER TABLE student_wallets ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE;`;
    await sql`ALTER TABLE student_wallets ADD COLUMN IF NOT EXISTS daily_spending_limit DOUBLE PRECISION DEFAULT 2000;`;
    await sql`ALTER TABLE student_wallets ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;`;
    await sql`ALTER TABLE student_wallets ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`;

    // 5. canteen_meal_consumptions table
    await sql`
      CREATE TABLE IF NOT EXISTS canteen_meal_consumptions (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE NOT NULL,
        subscription_id INTEGER REFERENCES canteen_meal_subscriptions(id) ON DELETE SET NULL,
        meal_type VARCHAR(50) DEFAULT 'Déjeuner',
        consumption_date VARCHAR(20) NOT NULL,
        served_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        menu_description TEXT,
        served_by VARCHAR(100) DEFAULT 'Chef de Cantine',
        allergy_warning_triggered BOOLEAN DEFAULT FALSE,
        cost_deducted DOUBLE PRECISION DEFAULT 0,
        parent_notified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 6. canteen_transactions table alterations
    await sql`
      CREATE TABLE IF NOT EXISTS canteen_transactions (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE NOT NULL,
        amount DOUBLE PRECISION NOT NULL,
        type VARCHAR(50) DEFAULT 'Recharge',
        payment_method VARCHAR(50) DEFAULT 'Espèces',
        items_desc TEXT,
        transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        recorded_by VARCHAR(100)
      );
    `;

    await sql`ALTER TABLE canteen_transactions ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE;`;
    await sql`ALTER TABLE canteen_transactions ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'Recharge';`;
    await sql`ALTER TABLE canteen_transactions ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'Espèces';`;

    // Indexes
    await sql`CREATE INDEX IF NOT EXISTS canteen_items_school_id_idx ON canteen_items(school_id);`;
    await sql`CREATE INDEX IF NOT EXISTS canteen_weekly_menu_school_id_idx ON canteen_weekly_menu(school_id);`;
    await sql`CREATE INDEX IF NOT EXISTS canteen_weekly_menu_week_idx ON canteen_weekly_menu(week_start_date);`;
    await sql`CREATE INDEX IF NOT EXISTS canteen_meal_subscriptions_school_id_idx ON canteen_meal_subscriptions(school_id);`;
    await sql`CREATE INDEX IF NOT EXISTS canteen_meal_subscriptions_student_id_idx ON canteen_meal_subscriptions(student_id);`;
    await sql`CREATE INDEX IF NOT EXISTS student_wallets_school_id_idx ON student_wallets(school_id);`;
    await sql`CREATE INDEX IF NOT EXISTS student_wallets_student_id_idx ON student_wallets(student_id);`;
    await sql`CREATE INDEX IF NOT EXISTS canteen_meal_consumptions_school_id_idx ON canteen_meal_consumptions(school_id);`;
    await sql`CREATE INDEX IF NOT EXISTS canteen_meal_consumptions_student_id_idx ON canteen_meal_consumptions(student_id);`;
    await sql`CREATE INDEX IF NOT EXISTS canteen_meal_consumptions_date_idx ON canteen_meal_consumptions(consumption_date);`;

    console.log("✅ Canteen tables and indexes successfully ensured on PostgreSQL!");
  } catch (err) {
    console.error("❌ Migration error:", err);
  } finally {
    await sql.end();
  }
}

run();
