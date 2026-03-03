"use client";

import {createContext, useContext, useEffect, useMemo, useState} from "react";

type LikeCtx = {
  ids: Set<string>;
  toggle: (id: string) => void;
};

const LikeContext = createContext<LikeCtx | null>(null);
const STORAGE_KEY = "windblown.likes.v1";

export function LikeProvider({children}: {children: React.ReactNode}) {
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setIds(new Set(JSON.parse(stored) as string[]));
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  }, [ids]);

  const value = useMemo<LikeCtx>(
    () => ({
      ids,
      toggle: (id: string) =>
        setIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        }),
    }),
    [ids],
  );

  return <LikeContext.Provider value={value}>{children}</LikeContext.Provider>;
}

export function useLikes(): LikeCtx {
  const ctx = useContext(LikeContext);
  if (!ctx) throw new Error("LikeContext missing");
  return ctx;
}
