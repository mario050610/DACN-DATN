// Counts aggregate customer interactions; failures never block shopping.
export function recordBehavior(campaignId: string, kind: 'view' | 'click') {
  if (!campaignId) return;
  try {
    const key = `preora-behavior-${kind}-${campaignId}`;
    if (kind === 'view' && Date.now() - Number(sessionStorage.getItem(key) || 0) < 30000) return;
    if (kind === 'view') sessionStorage.setItem(key, String(Date.now()));
    void fetch('/api/analytics/events', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignId, kind, eventId: crypto.randomUUID() }) }).catch(() => {});
  } catch { /* Storage/telemetry failures must not affect the page. */ }
}
