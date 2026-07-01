"use client";

/**
 * Offline catch queue (IndexedDB). Every catch is written here FIRST — even when
 * online — so the capture tap never blocks on the network and the online/offline
 * paths are identical (spec §7: the Catch flow must work offline and sync later).
 * The sync module (`sync.ts`) drains this queue into Supabase.
 */

import type { AcquisitionType, PersonType } from "@/core/types/database";

export interface QueuedPerson {
  mlbPersonId: number;
  fullName: string;
  teamCode: string;
  jerseyNumber: number | null;
  position: string | null;
  personType: PersonType;
}

export interface QueuedCatch {
  localId: string;
  userId: string;
  // Game context captured at check-in (so sync needs no network for context).
  gameId: string; // Supabase games.id
  gamePk: number | null;
  gameDate: string;
  homeCode: string;
  awayCode: string;
  venue: string | null;
  // The catch itself.
  acquisitionType: AcquisitionType;
  occurredAt: string;
  person: QueuedPerson | null; // null = Skip
  createdAt: string;
  attempts: number;
}

const DB_NAME = "ballhawk";
const DB_VERSION = 1;
const STORE = "catchQueue";
const CHANGED_EVENT = "bhb:queue-changed";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "localId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
      })
  );
}

function notifyChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CHANGED_EVENT));
  }
}

export const QUEUE_CHANGED_EVENT = CHANGED_EVENT;

export function newLocalId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `c_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export async function enqueueCatch(
  entry: Omit<QueuedCatch, "localId" | "createdAt" | "attempts"> &
    Partial<Pick<QueuedCatch, "localId" | "createdAt" | "attempts">>
): Promise<QueuedCatch> {
  const full: QueuedCatch = {
    localId: entry.localId ?? newLocalId(),
    createdAt: entry.createdAt ?? new Date().toISOString(),
    attempts: entry.attempts ?? 0,
    ...entry,
  } as QueuedCatch;
  await tx("readwrite", (s) => s.put(full));
  notifyChanged();
  return full;
}

export async function getAllCatches(): Promise<QueuedCatch[]> {
  const all = await tx<QueuedCatch[]>("readonly", (s) =>
    s.getAll() as IDBRequest<QueuedCatch[]>
  );
  return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function countCatches(): Promise<number> {
  return tx<number>("readonly", (s) => s.count());
}

export async function updateCatch(entry: QueuedCatch): Promise<void> {
  await tx("readwrite", (s) => s.put(entry));
  notifyChanged();
}

export async function removeCatch(localId: string): Promise<void> {
  await tx("readwrite", (s) => s.delete(localId));
  notifyChanged();
}

export const BACKGROUND_SYNC_TAG = "bhb-sync-catches";

/**
 * Progressive enhancement: ask the browser to fire a background 'sync' when
 * connectivity returns, even if the tab is backgrounded. Guarded — the
 * Background Sync API is unsupported on iOS Safari, where the in-app flush
 * triggers (online/visibility/interval) are the real mechanism.
 */
export async function requestBackgroundSync(): Promise<void> {
  try {
    if (
      typeof navigator !== "undefined" &&
      "serviceWorker" in navigator &&
      typeof window !== "undefined" &&
      "SyncManager" in window
    ) {
      const reg = (await navigator.serviceWorker.ready) as ServiceWorkerRegistration & {
        sync?: { register: (tag: string) => Promise<void> };
      };
      await reg.sync?.register(BACKGROUND_SYNC_TAG);
    }
  } catch {
    // Not supported / permission denied — safe to ignore.
  }
}
