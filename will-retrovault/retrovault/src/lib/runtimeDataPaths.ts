import path from 'path';

export function getDataDir() {
  return process.env.RETROVAULT_DATA_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), 'data');
}

export function resolveDataPath(filename: string) {
  return process.env.RETROVAULT_DATA_DIR
    ? path.join(process.env.RETROVAULT_DATA_DIR, filename)
    : path.join(/*turbopackIgnore: true*/ process.cwd(), 'data', filename);
}

export function getDatabasePath() {
  return process.env.RETROVAULT_DB_PATH || resolveDataPath('retrovault.db');
}

export function getDatabaseUrl() {
  const dbPath = getDatabasePath();
  return process.env.DATABASE_URL || `file:${dbPath}`;
}

export function getRuntimeLabel() {
  return process.env.RETROVAULT_ENV || process.env.NODE_ENV || 'development';
}

export function getConfigPath() {
  return process.env.RETROVAULT_CONFIG_PATH || resolveDataPath('app.config.json');
}

export function getScrapersPath() {
  return process.env.RETROVAULT_SCRAPERS_PATH || resolveDataPath('scrapers.json');
}
