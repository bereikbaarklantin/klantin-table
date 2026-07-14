"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { store } from "@/lib/store";

/**
 * Live data-hook: haalt data op, abonneert op realtime-wijzigingen en
 * pollt als vangnet elke `pollMs` (verbindingshaperingen op locatie).
 */
export function useLive<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
  pollMs = 8000
): { data: T | null; refresh: () => void; loading: boolean } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refresh = useCallback(() => {
    fetcherRef
      .current()
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
    const unsub = store.subscribe(refresh);
    const t = setInterval(refresh, pollMs);
    return () => {
      unsub();
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, refresh, loading };
}

/** Tikt elke seconde — voor timers en "x min geleden"-weergave. */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

/** Korte piep voor nieuwe tickets (WebAudio, geen audiobestanden nodig). */
export function useBeep(): () => void {
  const ctxRef = useRef<AudioContext | null>(null);
  return useCallback(() => {
    try {
      if (typeof window === "undefined") return;
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return;
      if (!ctxRef.current) ctxRef.current = new AC();
      const ctx = ctxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // stil falen: geluid is nice-to-have
    }
  }, []);
}

/** Signaleert nieuwe id's in een lijst (voor geluidsmeldingen). */
export function useNewItemSignal(ids: string[], onNew: () => void) {
  const known = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (known.current === null) {
      known.current = new Set(ids);
      return;
    }
    const fresh = ids.some((id) => !known.current!.has(id));
    ids.forEach((id) => known.current!.add(id));
    if (fresh) onNew();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join("|")]);
}
