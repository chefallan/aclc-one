"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

/**
 * Keeps a server-rendered page from going stale while someone is looking at it.
 *
 * Polls a tiny stamp endpoint and, when the stamp changes, calls
 * router.refresh() - so the server re-renders the page with fresh data and
 * React reconciles it. Scroll position, open menus and form state survive,
 * which a location.reload() would not.
 *
 * Three things keep the cost honest:
 *
 *   - It stops entirely while the tab is hidden. A backgrounded tab polling
 *     every fifteen seconds is a serverless invocation every fifteen seconds
 *     for nobody, and on Vercel that is billed.
 *   - It checks once immediately on becoming visible again, which is the
 *     moment the data is most likely to have moved on.
 *   - A failed poll is not treated as a change, and repeated failures back
 *     off, so a server hiccup cannot turn into a refresh loop.
 */
export function LiveRefresh({
  scope,
  id,
  intervalMs = 15_000,
  onChange,
}: {
  scope: "section-schedule" | "my-schedule" | "accounts" | "sections";
  id?: string;
  intervalMs?: number;
  /**
   * For a component that fetched its own data on the client. router.refresh()
   * re-renders the server tree and would never reach it, so it reloads itself.
   */
  onChange?: () => void;
}) {
  const router = useRouter();
  // Refs, not state: changing these must never re-render, or the effect
  // tears down and rebuilds its own timer on every poll.
  const seen = React.useRef<string | null>(null);
  const failures = React.useRef(0);
  // Held in a ref so a caller passing an inline arrow does not restart polling
  // on every one of its own renders.
  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  React.useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const url = `/api/live?scope=${encodeURIComponent(scope)}${id ? `&id=${encodeURIComponent(id)}` : ""}`;

    async function check() {
      if (cancelled || document.visibilityState !== "visible") return;

      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));

        const { stamp } = (await res.json()) as { stamp: string };
        failures.current = 0;

        if (seen.current === null) {
          // First reading is the baseline. Refreshing here would reload the
          // page immediately on every mount for no reason.
          seen.current = stamp;
        } else if (stamp !== seen.current) {
          seen.current = stamp;
          if (onChangeRef.current) onChangeRef.current();
          else router.refresh();
        }
      } catch {
        failures.current += 1;
      }
    }

    function schedule() {
      if (cancelled) return;
      // Back off while failing: 15s, 30s, 60s, capped at two minutes.
      const backoff = Math.min(intervalMs * 2 ** failures.current, 120_000);
      timer = setTimeout(async () => {
        await check();
        schedule();
      }, backoff);
    }

    function onVisibility() {
      if (document.visibilityState === "visible") void check();
    }

    document.addEventListener("visibilitychange", onVisibility);
    void check();
    schedule();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [scope, id, intervalMs, router]);

  return null;
}
