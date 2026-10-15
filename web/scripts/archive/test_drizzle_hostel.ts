import { db } from "../src/infrastructure/database";
import { hostelRooms } from "../src/infrastructure/database/schema/hostel";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../.env.local") });

async function run() {
  try {
    console.log("Attempting insert using Drizzle ORM...");
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
    const deleted = await db.delete(hostelRooms).where(hostelRooms.roomNumber.eq("00001-A32"));
    console.log("Cleaned up successfully!");
    process.exit(0);
  } catch (err: any) {
    console.error("Insert failed with error message:", err.message);
    console.error("Full error:", err);
    process.exit(1);
  }
}

run();
