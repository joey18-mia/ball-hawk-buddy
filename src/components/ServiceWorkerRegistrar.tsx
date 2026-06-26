"use client";

import { useEffect } from "react";

/**
 * Registers the service worker once on the client. Rendered in the root layout.
 * Kept tiny and side-effect-only so it doesn't entangle UI with PWA plumbing.
 */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV === "development") return; // avoid dev caching headaches

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => undefined);
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
