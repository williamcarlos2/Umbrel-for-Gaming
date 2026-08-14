export type ConventionPurchase = {
  id: string;
  title: string;
  platform: string;
  price: number;
  condition: string;
  notes: string;
  at: string;
  timestamp: string;
  source?: string;
};

export type ConventionSession = {
  id: string;
  name: string;
  budget: number;
  purchases: ConventionPurchase[];
  createdAt: string;
  isActive?: boolean;
  endedAt?: string | null;
};

export const CONVENTION_STORAGE_KEY = 'rv-convention-sessions';

export function loadConventionSessions(): ConventionSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(CONVENTION_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveConventionSessions(sessions: ConventionSession[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CONVENTION_STORAGE_KEY, JSON.stringify(sessions));
  window.dispatchEvent(new CustomEvent('retrovault:convention-sessions-updated'));
}

export function mutateConventionSessions(
  updater: (sessions: ConventionSession[]) => ConventionSession[]
): ConventionSession[] {
  const current = loadConventionSessions();
  const updated = updater(current);
  saveConventionSessions(updated);
  return updated;
}

export function getActiveConventionSession(sessions = loadConventionSessions()): ConventionSession | null {
  return sessions.find((session) => session.isActive) || null;
}

export function addPurchaseToActiveConventionSession(purchase: Omit<ConventionPurchase, 'id' | 'timestamp'>) {
  if (typeof window === 'undefined') return false;
  const sessions = loadConventionSessions();
  const active = getActiveConventionSession(sessions);
  if (!active) return false;

  const nextPurchase: ConventionPurchase = {
    ...purchase,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
  };

  mutateConventionSessions((currentSessions) => currentSessions.map((session) =>
    session.id === active.id
      ? { ...session, purchases: [...(session.purchases || []), nextPurchase] }
      : { ...session, isActive: false }
  ));
  return true;
}
