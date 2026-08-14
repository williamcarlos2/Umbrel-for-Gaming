#!/usr/bin/env node
// Standalone OCR worker — runs in a child process so crashes are isolated from the main server.
// Usage: node scripts/ocr-worker.mjs <imagePath>
// Output: JSON to stdout

import { createWorker } from 'tesseract.js';

const [,, imagePath] = process.argv;
if (!imagePath) {
  process.stdout.write(JSON.stringify({ error: 'No image path provided' }));
  process.exit(1);
}

let worker;
try {
  worker = await createWorker({ logger: () => {} });
  await worker.loadLanguage('eng');
  await worker.initialize('eng');
  const result = await worker.recognize(imagePath);
  await worker.terminate();
  process.stdout.write(JSON.stringify({
    text: result.data.text || '',
    confidence: result.data.confidence ?? 0,
  }));
  process.exit(0);
} catch (err) {
  if (worker) { try { await worker.terminate(); } catch {} }
  process.stdout.write(JSON.stringify({ error: err?.message || 'OCR failed', text: '', confidence: 0 }));
  process.exit(0); // exit 0 so caller gets the JSON, not a shell error
}
