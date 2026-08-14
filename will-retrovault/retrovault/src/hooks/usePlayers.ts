"use client";
import { useState, useEffect, useCallback } from "react";
import type { Person, PlayerData } from "@/types";

export function usePlayers() {
  const [people, setPeople] = useState<Person[]>([]);
  const [favData, setFavData] = useState<Record<string, string[]>>({});
  const [regretData, setRegretData] = useState<Record<string, string[]>>({});

  const fetch_ = useCallback(() => {
    fetch("/api/favorites")
      .then(r => r.json())
      .then((d: PlayerData) => {
        setPeople(d.people || []);
        setFavData(d.favorites || {});
        setRegretData(d.regrets || {});
      })
      .catch(console.error);
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const isFavorited = (gameId: string, personId: string) =>
    (favData[personId] || []).includes(gameId);

  const isRegreted = (gameId: string, personId: string) =>
    (regretData[personId] || []).includes(gameId);

  const whoFavorited = (gameId: string): Person[] =>
    people.filter(p => isFavorited(gameId, p.id));

  const whoRegreted = (gameId: string): Person[] =>
    people.filter(p => isRegreted(gameId, p.id));

  const toggleFavorite = async (personId: string, gameId: string) => {
    await fetch("/api/favorites", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_favorite", personId, gameId })
    });
    fetch_();
  };

  const toggleRegret = async (personId: string, gameId: string) => {
    await fetch("/api/favorites", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_regret", personId, gameId })
    });
    fetch_();
  };

  return {
    people, favData, regretData,
    isFavorited, isRegreted, whoFavorited, whoRegreted,
    toggleFavorite, toggleRegret,
    refetch: fetch_,
  };
}
