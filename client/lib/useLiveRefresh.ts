"use client";

import { useEffect, useRef } from "react";

/**
 * How often an open page re-reads the gateway's own database. New mail is
 * fetched and scanned by the server (the background sweep, or a push
 * notification), so this only has to notice results that already exist.
 */
export const LIVE_REFRESH_MS = 15_000;

/**
 * Re-run `refresh` periodically while the tab is visible, and as soon as it
 * becomes visible again, so newly scanned mail appears without a reload.
 * A hidden tab makes no requests. With `immediate`, it also runs on mount, for
 * pages whose first load is the same request as every refresh.
 */
export function useLiveRefresh(
  refresh: () => void,
  { intervalMs = LIVE_REFRESH_MS, immediate = false } = {},
) {
  const latest = useRef(refresh);

  useEffect(() => {
    latest.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (immediate) latest.current();
  }, [immediate]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") latest.current();
    };
    const timer = setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [intervalMs]);
}
