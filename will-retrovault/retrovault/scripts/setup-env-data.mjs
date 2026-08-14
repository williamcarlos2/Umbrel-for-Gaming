#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const dataRoot = path.join(root, 'data');
const sampleConfig = path.join(dataRoot, 'sample', 'app.config.sample.json');

const envs = [
  { name: 'prod', db: 'retrovault.db' },
  { name: 'dev', db: 'retrovault.db' },
  { name: 'nightly', db: 'retrovault.db' },
];

for (const env of envs) {
  const dir = path.join(dataRoot, env.name);
  fs.mkdirSync(dir, { recursive: true });

  const configPath = path.join(dir, 'app.config.json');
  if (!fs.existsSync(configPath) && fs.existsSync(sampleConfig)) {
    fs.copyFileSync(sampleConfig, configPath);
    console.log(`Created ${configPath}`);
  }

  const scrapersPath = path.join(dir, 'scrapers.json');
  if (!fs.existsSync(scrapersPath)) {
    fs.writeFileSync(scrapersPath, JSON.stringify({}, null, 2));
    console.log(`Created ${scrapersPath}`);
  }

  const dbPath = path.join(dir, env.db);
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, '');
    console.log(`Created ${dbPath}`);
  }
}

console.log('Environment data directories initialized.');
