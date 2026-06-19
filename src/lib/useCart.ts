import { useCallback, useEffect, useMemo, useState } from "react";

const CART_KEY = "recyclerie-cart-article-ids";
const CART_EVENT = "recyclerie-cart-updated";

function readCartIds() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

function writeCartIds(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CART_KEY, JSON.stringify(Array.from(new Set(ids))));
  window.dispatchEvent(new Event(CART_EVENT));
}

export function useCart() {
  const [ids, setIds] = useState<string[]>(() => readCartIds());

  useEffect(() => {
    function sync() {
      setIds(readCartIds());
    }
    window.addEventListener("storage", sync);
    window.addEventListener(CART_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(CART_EVENT, sync);
    };
  }, []);

  const add = useCallback((id: string) => {
    const next = Array.from(new Set([...readCartIds(), id]));
    writeCartIds(next);
    setIds(next);
  }, []);

  const remove = useCallback((id: string) => {
    const next = readCartIds().filter((item) => item !== id);
    writeCartIds(next);
    setIds(next);
  }, []);

  const clear = useCallback(() => {
    writeCartIds([]);
    setIds([]);
  }, []);

  const has = useCallback((id: string) => ids.includes(id), [ids]);

  return useMemo(
    () => ({ ids, count: ids.length, add, remove, clear, has }),
    [add, clear, has, ids, remove],
  );
}
