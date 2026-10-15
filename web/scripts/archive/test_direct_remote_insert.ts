import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { hostelRooms } from "../src/infrastructure/database/schema/hostel";
import { eq } from "drizzle-orm";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function run() {
  const client = postgres(remoteUrl, { ssl: { rejectUnauthorized: false } });
  const db = drizzle(client);

  try {
    console.log("Attempting insert on ACTUAL REMOTE DATABASE...");
    const res = await db.insert(hostelRooms).values({
      roomNumber: "00001-A32",
      buildingName: "Good",
      roomType: "Filles",
      capacity: 4,
      costPerTerm: 50000,
      schoolId: 2 // active school context
    }).returning();
    console.log("Insert succeeded!", res);
    
    // Clean up
    console.log("Cleaning up...");
    await db.delete(hostelRooms).where(eq(hostelRooms.roomNumber, "00001-A32"));
    console.log("Cleaned up successfully!");
    process.exit(0);
  } catch (err: any) {
    console.error("Insert failed on remote database!");
    console.error("Error message:", err.message);
    console.error(err);
    process.exit(1);
  }
}

run();
