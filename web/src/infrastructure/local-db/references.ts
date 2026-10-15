import { localDb, type LocalReferenceItem } from "./dexie";

type ReferenceType = LocalReferenceItem["type"];

export async function cacheReferenceItems(type: ReferenceType, items: any[], labelKey: string) {
  const now = Date.now();
  const rows = items.map((item) => ({
    type,
    remoteId: item.id ?? item.value ?? null,
    label: item[labelKey] || item.name || item.label || String(item.id || ""),
    payload: item,
    updatedAt: now,
  }));

  await localDb.references.where("type").equals(type).delete();
  if (rows.length > 0) {
    await localDb.references.bulkPut(rows);
  }
}

export async function getCachedReferenceItems<T = any>(type: ReferenceType): Promise<T[]> {
  const rows = await localDb.references.where("type").equals(type).toArray();
  return rows.map((row) => row.payload as T);
}

export async function resolveOnlineOrCached<T = any>(
  type: ReferenceType,
  loader: () => Promise<any>,
  labelKey: string,
): Promise<T[]> {
  try {
    const res = await loader();
    const data = Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    if (data.length > 0) {
      await cacheReferenceItems(type, data, labelKey);
      return data as T[];
    }
  } catch (error) {
    console.warn(`[references] Falling back to cached ${type}:`, error);
  }

  return getCachedReferenceItems<T>(type);
}
