import { beforeEach, describe, expect, it, vi } from 'vitest';

const readEventsCompat = vi.fn();
const addEventCompat = vi.fn();
const updateEventCompat = vi.fn();
const deleteEventCompat = vi.fn();

vi.mock('@/lib/storageCompat', () => ({
  readEventsCompat,
  addEventCompat,
  updateEventCompat,
  deleteEventCompat,
}));

async function loadRoute() {
  return import('@/app/api/events/route');
}

describe('/api/events route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('GET returns compat-backed events', async () => {
    readEventsCompat.mockResolvedValue([{ id: 'event-1', title: 'MGC', attending: false, interested: false }]);

    const route = await loadRoute();
    const response = await route.GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body[0].id).toBe('event-1');
  });

  it('POST add_manual creates an event through compat storage', async () => {
    addEventCompat.mockResolvedValue({ id: 'event-2', title: 'Garage Sale Raid' });

    const route = await loadRoute();
    const response = await route.POST(new Request('http://localhost/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_manual', title: 'Garage Sale Raid', date: '2026-04-21', location: 'Detroit' }),
    }));

    expect(response.status).toBe(200);
    expect((await response.json()).id).toBe('event-2');
  });

  it('POST toggle_attending flips attending state using compat update', async () => {
    readEventsCompat.mockResolvedValue([{ id: 'event-3', title: 'MGC', attending: false, interested: false }]);
    updateEventCompat.mockResolvedValue({ id: 'event-3', attending: true, interested: false });

    const route = await loadRoute();
    const response = await route.POST(new Request('http://localhost/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_attending', id: 'event-3' }),
    }));

    expect(response.status).toBe(200);
    expect((await response.json()).attending).toBe(true);
  });
});
