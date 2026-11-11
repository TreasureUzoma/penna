"use client";

import { useSyncExternalStore } from "react";
import { useTeams, type Team } from "@/hooks/use-teams";

const ACTIVE_TEAM_KEY = "penna-active-team";
const ACTIVE_TEAM_EVENT = "penna-active-team-change";

const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  window.addEventListener(ACTIVE_TEAM_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(ACTIVE_TEAM_EVENT, onChange);
  };
};

const getStoredTeamSlug = () => window.localStorage.getItem(ACTIVE_TEAM_KEY);
const getServerTeamSlug = () => null;

export const setActiveTeamSlug = (slug: string | null) => {
  if (typeof window === "undefined") return;
  if (slug) window.localStorage.setItem(ACTIVE_TEAM_KEY, slug);
  else window.localStorage.removeItem(ACTIVE_TEAM_KEY);
  window.dispatchEvent(new Event(ACTIVE_TEAM_EVENT));
};

export function useActiveTeam() {
  const { data: teams, isLoading } = useTeams();
  const storedSlug = useSyncExternalStore(
    subscribe,
    getStoredTeamSlug,
    getServerTeamSlug,
  );
  const activeTeam =
    teams?.find((team) => team.slug === storedSlug) ?? teams?.[0] ?? null;

  return {
    teams: teams ?? [],
    activeTeam,
    setActiveTeam: (team: Team | null) => setActiveTeamSlug(team?.slug ?? null),
    isLoading,
  };
}
