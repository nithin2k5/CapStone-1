"use client";

import { useSyncExternalStore } from "react";
import {
  AuthSession,
  getAuthSessionSnapshot,
  getServerAuthSession,
  subscribeToAuthSession,
} from "@/lib/auth";

/**
 * The stored session, read without a hydration mismatch.
 *
 * sessionStorage does not exist while the page is rendered on the server, so
 * the session cannot be read during the first render. Reading it in an effect
 * and calling setState is the obvious fix and the wrong one — it schedules a
 * second render pass on every mount. useSyncExternalStore is the sanctioned
 * shape: the server snapshot is null, the client snapshot is the real value,
 * and React reconciles the two itself.
 */
export function useAuthSession(): AuthSession | null {
  return useSyncExternalStore(
    subscribeToAuthSession,
    getAuthSessionSnapshot,
    getServerAuthSession,
  );
}
