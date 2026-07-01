"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { flushQueue } from "@/lib/offline/sync";
import {
  countCatches,
  QUEUE_CHANGED_EVENT,
  requestBackgroundSync,
} from "@/lib/offline/catchQueue";

/**
 * App-wide offline sync coordinator. Mounted once in the root layout. Keeps a
 * live pending-catch count and flushes the queue whenever we (re)gain
 * connectivity or the app comes to the foreground. Renders a small status pill
 * only when catches are waiting.
 */
export default function SyncManager() {
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );

  const refreshCount = useCallback(async () => {
    try {
      setPending(await countCatches());
    } catch {
      // IndexedDB unavailable — nothing to show.
    }
  }, []);

  const tryFlush = useCallback(async () => {
    try {
      const client = getSupabaseBrowserClient();
      const { data } = await client.auth.getSession();
      if (data.session) {
        await flushQueue(client);
      }
    } catch {
      // Best effort; the next trigger will retry.
    }
    await refreshCount();
  }, [refreshCount]);

  useEffect(() => {
    // Kick off async work on mount: read the queue count (IndexedDB) and attempt
    // a flush. Both set state only after their awaits, off the render path.
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    refreshCount();
    tryFlush();

    const onOnline = () => {
      setOnline(true);
      tryFlush();
    };
    const onOffline = () => setOnline(false);
    const onVisible = () => {
      if (document.visibilityState === "visible") tryFlush();
    };
    const onChanged = () => {
      refreshCount();
      requestBackgroundSync();
      tryFlush();
    };
    const onSwMessage = (e: MessageEvent) => {
      if (e.data?.type === "bhb:flush") tryFlush();
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(QUEUE_CHANGED_EVENT, onChanged);
    navigator.serviceWorker?.addEventListener("message", onSwMessage);

    // Periodic retry while the app is open (covers flaky stadium signal).
    const timer = window.setInterval(() => {
      if (navigator.onLine) tryFlush();
    }, 30000);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(QUEUE_CHANGED_EVENT, onChanged);
      navigator.serviceWorker?.removeEventListener("message", onSwMessage);
      window.clearInterval(timer);
    };
  }, [refreshCount, tryFlush]);

  if (pending <= 0) return null;

  const noun = pending === 1 ? "catch" : "catches";
  return (
    <div className={`sync-indicator ${online ? "" : "offline"}`}>
      {online
        ? `Syncing ${pending} ${noun}…`
        : `${pending} ${noun} waiting · offline`}
    </div>
  );
}
