import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  try {
    // 1. Get a transport route
    const routes = await sql`SELECT id, route_name FROM public.transport_routes LIMIT 1`;
    let routeId;
    if (routes.length === 0) {
      console.log("No transport routes found. Let's create one!");
      const newRoute = await sql`
        INSERT INTO public.transport_routes (route_name, vehicle_number, driver_name, driver_phone, monthly_fee, school_id)
        VALUES ('Route Test Ado', 'TR-1234-A', 'Moussa Driver', '+227 99 99 99 99', 15000, 1)
        RETURNING id
      `;
      routeId = newRoute[0].id;
      console.log("Created test route with ID:", routeId);
    } else {
      routeId = routes[0].id;
      console.log("Found existing route with ID:", routeId);
    }

    // 2. Check if a subscription already exists for student 59
    const subs = await sql`SELECT id FROM public.transport_subscriptions WHERE student_id = 59`;
    if (subs.length === 0) {
      console.log("Creating transport subscription for student 59...");
      await sql`
        INSERT INTO public.transport_subscriptions (student_id, route_id, pickup_point, status, school_id)
        VALUES (59, ${routeId}, 'Rond-point Ado', 'Actif', 1)
      `;
      console.log("✅ Transport subscription created successfully!");
    } else {
      console.log("Transport subscription already exists for student 59.");
    }
  } catch (err: any) {
    console.error("Error:", err.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
