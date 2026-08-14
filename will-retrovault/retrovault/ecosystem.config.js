const path = require('path');

const ROOT = "/home/apesch/.openclaw/workspace/retrovault";
const RUNTIME_ROOTS = {
  prod: "/home/apesch/.openclaw/workspace/retrovault",
  dev: "/home/apesch/.openclaw/workspace/retrovault-autopush/retrovault",
  nightly: "/home/apesch/.openclaw/workspace/retrovault-nightly/retrovault",
};

function makeApp(name, runtimeEnv, port) {
  const suffix = runtimeEnv === 'prod' ? 'prod' : runtimeEnv;
  const cwd = RUNTIME_ROOTS[runtimeEnv] || ROOT;
  return {
    name,
    script: "node_modules/.bin/next",
    args: "start",
    cwd,

    instances: 1,
    exec_mode: "fork",
    autorestart: true,
    watch: false,
    max_memory_restart: "512M",

    env: {
      NODE_ENV: "production",
      RETROVAULT_ENV: runtimeEnv,
      PORT: port,
      HOSTNAME: "127.0.0.1",
      RETROVAULT_DATA_DIR: path.join(cwd, 'data', suffix),
      RETROVAULT_CONFIG_PATH: path.join(cwd, 'data', suffix, 'app.config.json'),
      RETROVAULT_SCRAPERS_PATH: path.join(cwd, 'data', suffix, 'scrapers.json'),
      RETROVAULT_DB_PATH: path.join(cwd, 'data', suffix, 'retrovault.db'),
      DATABASE_URL: `file:${path.join(cwd, 'data', suffix, 'retrovault.db')}`,
    },

    out_file: path.join(cwd, 'logs', `${name}-out.log`),
    error_file: path.join(cwd, 'logs', `${name}-err.log`),
    merge_logs: true,
    log_date_format: "YYYY-MM-DD HH:mm:ss",

    exp_backoff_restart_delay: 100,
    min_uptime: "10s",
  };
}

module.exports = {
  apps: [
    makeApp('retrovault-prod', 'prod', 3000),
    makeApp('retrovault-dev', 'dev', 3001),
    makeApp('retrovault-nightly', 'nightly', 3002),
  ],
};
