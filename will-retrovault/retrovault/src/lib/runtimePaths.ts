import path from 'path';

export function getProjectRootPath() {
  return process.cwd();
}

export function getLogsDir() {
  return path.join(/*turbopackIgnore: true*/ process.cwd(), 'logs');
}

export function resolveLogPath(logPath: string) {
  return path.isAbsolute(logPath) ? logPath : path.join(/*turbopackIgnore: true*/ process.cwd(), logPath);
}

export function resolveProjectPath(relativePath: string) {
  return path.isAbsolute(relativePath) ? relativePath : path.join(/*turbopackIgnore: true*/ process.cwd(), relativePath);
}
