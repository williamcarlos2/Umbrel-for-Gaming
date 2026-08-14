export async function unlockAchievement(id: string): Promise<boolean> {
  try {
    const response = await fetch('/api/achievements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'unlock_manual', id }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
