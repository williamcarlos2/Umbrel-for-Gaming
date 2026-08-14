"use client";
import { useState, useEffect, useCallback } from "react";
import type { GameItem } from "@/types";

export function useInventory() {
  const [items, setItems] = useState<GameItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInventory = useCallback(() => {
    setLoading(true);
    fetch("/api/inventory")
      .then(r => r.json())
      .then(d => { setItems(d); setError(null); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { queueMicrotask(fetchInventory); }, [fetchInventory]);

  return { items, loading, error, refetch: fetchInventory };
}
