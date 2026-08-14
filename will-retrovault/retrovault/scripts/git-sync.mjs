/**
 * RetroVault Git Auto-Sync
 * Commits and pushes any uncommitted changes to GitHub.
 * Safe to run repeatedly — skips if nothing changed.
 */
import { execSync } from 'child_process';

const ROOT = new URL('..', import.meta.url).pathname;

function run(cmd, opts = {}) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf8', ...opts }).trim();
}

try {
  // Check if there are any changes
  const status = run('git status --porcelain');
  if (!status) {
    console.log('✅ Nothing to commit — repo is up to date.');
    process.exit(0);
  }

  const changed = status.split('\n').length;
  console.log(`📦 ${changed} file(s) changed. Committing...`);

  // Stage all changes
  run('git add -A');

  // Build a meaningful commit message
  const date = new Date().toISOString().replace('T', ' ').slice(0, 16);
  const files = status.split('\n').slice(0, 5).map(l => l.trim().split(' ').pop()).join(', ');
  const msg = `🔄 Auto-sync ${date} — ${changed} change${changed !== 1 ? 's' : ''} (${files}${changed > 5 ? '...' : ''})`;

  run(`git commit -m "${msg}"`);
  console.log(`✅ Committed: ${msg}`);

  // Push to the fast integration lane by default
  run('git push origin autopush');
  console.log('✅ Pushed to github.com/theretrovault/retrovault (autopush)');

} catch (e) {
  console.error('❌ Git sync failed:', e.message);
  process.exit(1);
}
