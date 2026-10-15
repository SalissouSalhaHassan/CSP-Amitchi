import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(__dirname, "../.env.local") });

// Override DATABASE_URL with REMOTE_DATABASE_URL to force remote connection
if (process.env.REMOTE_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.REMOTE_DATABASE_URL;
}

import { db } from "../src/infrastructure/database";
import { hostelRooms } from "../src/infrastructure/database/schema/hostel";
import { eq } from "drizzle-orm";

async function run() {
  try {
    console.log("Attempting insert on REMOTE DATABASE...");
    const res = await db.insert(hostelRooms).values({
      roomNumber: "00001-A32",
      buildingName: "Good",
      roomType: "Filles",
      capacity: 4,
      cost: 50000,
      occupiedBeds: 0
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
