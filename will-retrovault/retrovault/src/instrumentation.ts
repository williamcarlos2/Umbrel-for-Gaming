/**
 * Next.js Instrumentation Hook
 * Runs once when the server starts (both dev and production).
 * Used to initialize the in-process scheduler.
 */

export async function register() {
  // Only run on the server side (not in the edge runtime or browser).
  // Dev/preview containers can expose scraper controls without running the
  // background scheduler against copied/sanitized data.
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.RETROVAULT_SCHEDULER_ENABLED !== 'false') {
    const { startScheduler } = await import('./lib/scheduler');
    startScheduler();
  }
}
