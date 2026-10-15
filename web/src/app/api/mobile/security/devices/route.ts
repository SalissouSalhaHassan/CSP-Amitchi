import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { readDb, db } from "@/infrastructure/database";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";

export const dynamic = "force-dynamic";

// Ensure user_devices table exists dynamically
async function ensureDeviceTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS user_devices (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      device_id VARCHAR(255) NOT NULL,
      brand VARCHAR(100) DEFAULT 'Smartphone',
      model VARCHAR(100) DEFAULT 'Android Device',
      os VARCHAR(50) DEFAULT 'Android',
      os_version VARCHAR(50) DEFAULT '14',
      ip_address VARCHAR(100),
      is_locked BOOLEAN DEFAULT false,
      is_active BOOLEAN DEFAULT true,
      last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_user_devices_uid ON user_devices(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_devices_did ON user_devices(device_id);
  `);
}

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    await ensureDeviceTable();

    const searchParams = request.nextUrl.searchParams;
    const clientDeviceId = searchParams.get("deviceId") || "default_device";

    const rowsRes = await readDb.execute(sql`
      SELECT id, user_id, device_id, brand, model, os, os_version, ip_address, is_locked, is_active, last_active, created_at
      FROM user_devices
      WHERE user_id = ${user.id} AND is_active = true
      ORDER BY last_active DESC
    `);

    const allDevices = ((rowsRes as any).rows || rowsRes) as any[];

    // Check if single device lock is active for any device or overall for user
    const hasLock = allDevices.some((d) => d.is_locked === true);

    // Current device identification
    const currentDevice = allDevices.find((d) => d.device_id === clientDeviceId) || null;
    const otherDevices = allDevices.filter((d) => d.device_id !== clientDeviceId);

    return NextResponse.json({
      success: true,
      data: {
        singleDeviceLock: hasLock,
        currentDevice: currentDevice
          ? {
              id: currentDevice.id,
              deviceId: currentDevice.device_id,
              brand: currentDevice.brand || "SAMSUNG",
              model: currentDevice.model || "SM-A525F",
              os: currentDevice.os || "Android",
              osVersion: currentDevice.os_version || "14",
              lastActive: currentDevice.last_active,
              isCurrent: true,
            }
          : null,
        devices: otherDevices.map((d) => ({
          id: d.id,
          deviceId: d.device_id,
          brand: d.brand || "Smartphone",
          model: d.model || "Appareil",
          os: d.os || "Android",
          osVersion: d.os_version || "",
          ipAddress: d.ip_address || "Niamey, Niger",
          lastActive: d.last_active,
          createdAt: d.created_at,
          isCurrent: false,
        })),
        totalConnected: allDevices.length,
      },
    });
  } catch (error: any) {
    console.error("[Devices API GET Error]:", error);
    return mobileJsonError(error?.message || "Erreur de récupération des appareils", 500);
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    await ensureDeviceTable();

    const body = await request.json();
    const { action, deviceId, brand, model, os, osVersion, ipAddress, targetDeviceId } = body;

    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0] || ipAddress || "127.0.0.1";

    if (action === "register") {
      const dId = deviceId || `dev_${user.id}_${Date.now()}`;
      const dBrand = brand || "SAMSUNG";
      const dModel = model || "SM-A525F";
      const dOs = os || "Android";
      const dOsVersion = osVersion || "14";

      // Upsert device
      await db.execute(sql`
        INSERT INTO user_devices (user_id, device_id, brand, model, os, os_version, ip_address, last_active, is_active)
        VALUES (${user.id}, ${dId}, ${dBrand}, ${dModel}, ${dOs}, ${dOsVersion}, ${clientIp}, NOW(), true)
        ON CONFLICT (id) DO NOTHING;
      `);

      // Update existing if present
      await db.execute(sql`
        UPDATE user_devices
        SET brand = ${dBrand},
            model = ${dModel},
            os = ${dOs},
            os_version = ${dOsVersion},
            ip_address = ${clientIp},
            last_active = NOW(),
            is_active = true
        WHERE user_id = ${user.id} AND device_id = ${dId};
      `);

      return NextResponse.json({
        success: true,
        message: "Appareil enregistré avec succès",
        deviceId: dId,
      });
    }

    if (action === "toggle_lock") {
      const enableLock = Boolean(body.enabled);
      const currentDeviceId = deviceId || "";

      // Update lock flag
      await db.execute(sql`
        UPDATE user_devices
        SET is_locked = ${enableLock}
        WHERE user_id = ${user.id};
      `);

      // If lock enabled, revoke all other devices except the current one
      if (enableLock && currentDeviceId) {
        await db.execute(sql`
          UPDATE user_devices
          SET is_active = false
          WHERE user_id = ${user.id} AND device_id != ${currentDeviceId};
        `);
      }

      return NextResponse.json({
        success: true,
        singleDeviceLock: enableLock,
        message: enableLock
          ? "Verrouillage par téléphone unique activé. Seul cet appareil est autorisé."
          : "Verrouillage par téléphone unique désactivé.",
      });
    }

    if (action === "revoke") {
      const targetId = targetDeviceId || body.id;
      if (!targetId) {
        return mobileJsonError("targetDeviceId ou id requis", 400);
      }

      await db.execute(sql`
        UPDATE user_devices
        SET is_active = false
        WHERE user_id = ${user.id} AND (device_id = ${targetId} OR id = ${Number(targetId) || 0});
      `);

      return NextResponse.json({
        success: true,
        message: "Session de l'appareil révoquée avec succès",
      });
    }

    if (action === "revoke_all_others") {
      const currentDeviceId = deviceId || "";
      await db.execute(sql`
        UPDATE user_devices
        SET is_active = false
        WHERE user_id = ${user.id} AND device_id != ${currentDeviceId};
      `);

      return NextResponse.json({
        success: true,
        message: "Toutes les autres sessions ont été déconnectées.",
      });
    }

    return mobileJsonError("Action non reconnue", 400);
  } catch (error: any) {
    console.error("[Devices API POST Error]:", error);
    return mobileJsonError(error?.message || "Erreur de gestion des appareils", 500);
  }
}
