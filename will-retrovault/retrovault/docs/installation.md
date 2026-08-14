# RetroVault — Installation Guide

RetroVault runs on any modern OS with Node.js 22+ or Docker. Pick the path that works for you.

---

## 🐳 Docker (Recommended — All Platforms)

The simplest way to run RetroVault on any OS. Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/Mac) or Docker Engine (Linux).

### Docker — published image

Use the published stable image when you want the shortest install path:

```bash
mkdir -p retrovault-data
docker run -d \
  --name retrovault \
  -p 3000:3000 \
  -e RETROVAULT_SCHEDULER_ENABLED=false \
  -v "$PWD/retrovault-data:/app/data" \
  retrovault/retrovault:latest

# Open http://localhost:3000
# Health check: http://localhost:3000/api/health
```

Stable release tags are also available as both `vX.Y.Z` and `X.Y.Z`; for example, the 2026-06-24 install proof verified `retrovault/retrovault:v2.1.44` and `retrovault/retrovault:latest`. GHCR carries the same stable digest at `ghcr.io/theretrovault/retrovault:v2.1.44` / `latest`. The `nightly` tag is still a release-channel goal and should not be documented as live until a manifest is published.

### Docker Compose from source

Use the source checkout when developing or when you want to build locally:

```bash
git clone https://github.com/theretrovault/retrovault.git
cd retrovault/retrovault

# Start RetroVault — database and config are created automatically on first run
docker compose up -d

# Open http://localhost:3000
# The Setup Wizard will launch automatically on your first visit
```

### Docker — data and API keys

Your collection lives in a Docker named volume (`retrovault_retrovault-data`). Docker manages permissions automatically — no manual setup needed.

To find where data is stored on disk:
```bash
docker volume inspect retrovault_retrovault-data
```

To back up your data:
```bash
docker run --rm -v retrovault_retrovault-data:/data -v $(pwd):/backup alpine tar czf /backup/retrovault-backup.tar.gz /data
```

API keys are optional — RetroVault works without them. To enable YouTube videos, in-app bug reporting, or experimental Photo Lookup OCR:

```bash
cp .env.example .env.local
# Edit .env.local and uncomment the keys you want
```

See `.env.example` for all available options with explanations.

### Docker — scheduled scrapers

```bash
# Run the price fetcher manually
docker compose run --rm price-fetcher

# Run the event scraper manually
docker compose run --rm event-scraper
```

**Scheduled scrapers run automatically!** RetroVault includes a built-in scheduler — configure schedules from the Scraper Control Center (`/scrapers`) in the app UI. No crontab or external tools needed.

To run a scraper manually on-demand:
```bash
docker compose exec retrovault node scripts/bg-fetch.mjs
```

### Docker — updates

```bash
git pull
docker compose build
docker compose up -d
```

---

## 🐧 Linux (Debian / Ubuntu)

### Prerequisites

```bash
# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pm2 for process management
npm install -g pm2

# Install nginx (optional, for reverse proxy)
sudo apt install nginx -y
```

### Install

```bash
git clone https://github.com/theretrovault/retrovault.git
cd retrovault/retrovault
cp data/sample/app.config.sample.json data/app.config.json
npm install
npm run build
```

### Run with pm2

```bash
pm2 start ecosystem.config.js
pm2 save

# Auto-start on boot (run the command it outputs)
pm2 startup
```

### nginx reverse proxy

```bash
sudo cp nginx.conf.example /etc/nginx/sites-available/retrovault
# Edit to set your hostname
sudo nano /etc/nginx/sites-available/retrovault
sudo ln -s /etc/nginx/sites-available/retrovault /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### Scheduled scrapers (crontab)

```bash
crontab -e
# Add:
0 0 * * * node /path/to/retrovault/scripts/bg-fetch.mjs >> /path/to/retrovault/logs/bg-fetch.log 2>&1
0 1 * * * node /path/to/retrovault/scripts/snapshot-value.mjs >> /path/to/retrovault/logs/snapshot.log 2>&1
0 6 * * 1 node /path/to/retrovault/scripts/scrape-events.mjs >> /path/to/retrovault/logs/events-scraper.log 2>&1
```

---

## 🎩 Linux (CentOS / RHEL / Fedora)

### Prerequisites

```bash
# Install Node.js 22
curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
sudo dnf install -y nodejs

# Install pm2
npm install -g pm2

# Install nginx
sudo dnf install nginx -y
sudo systemctl enable nginx
```

### Firewall (firewalld, not ufw)

```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### SELinux note

If SELinux is in enforcing mode and pm2/Node can't write to the data directory:

```bash
# Check SELinux status
sestatus

# Allow Node to write to the data directory
sudo chcon -Rt httpd_sys_rw_content_t /path/to/retrovault/data/
sudo chcon -Rt httpd_sys_rw_content_t /path/to/retrovault/logs/

# Or, temporarily test with permissive mode:
sudo setenforce 0
```

The rest of the setup is identical to Debian/Ubuntu above.

---

## 🍎 macOS

### Prerequisites

```bash
# Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js 22
brew install node@22

# Install pm2
npm install -g pm2
```

### Install

```bash
git clone https://github.com/theretrovault/retrovault.git
cd retrovault/retrovault
cp data/sample/app.config.sample.json data/app.config.json
npm install
npm run build
```

### Run with pm2

```bash
pm2 start ecosystem.config.js
pm2 save

# Auto-start on login (uses launchd, not systemd)
pm2 startup
# Run the command it outputs (starts with: sudo env PATH=...)
```

### nginx (optional, via Homebrew)

```bash
brew install nginx
# Edit /usr/local/etc/nginx/nginx.conf or use sites-enabled pattern
```

### Cron (macOS uses standard crontab)

```bash
crontab -e
# Same cron syntax as Linux
```

---

## 🪟 Windows

### Option 1: WSL2 (Recommended)

The cleanest Windows experience. WSL2 gives you a full Linux environment:

```powershell
# Enable WSL2 (PowerShell as Administrator)
wsl --install
# Restart, then open Ubuntu from Start menu
```

Then follow the **Debian/Ubuntu** instructions above inside WSL2. Access the app at `http://localhost:3000` from any Windows browser.

### Option 2: Native Windows

**Prerequisites:**
- [Node.js 22](https://nodejs.org) (LTS)
- [Git for Windows](https://git-scm.com/download/win)
- Windows Terminal or PowerShell

```powershell
git clone https://github.com/theretrovault/retrovault.git
cd retrovault\retrovault
copy data\sample\app.config.sample.json data\app.config.json
npm install
npm run build
```

**Run with pm2:**
```powershell
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
```

**Auto-start on Windows boot:**
```powershell
# pm2 uses Task Scheduler on Windows
pm2 startup
# Follow the instructions it outputs
```

**Scheduled scrapers (Task Scheduler instead of cron):**

1. Open Task Scheduler → Create Basic Task
2. Trigger: Daily at midnight
3. Action: Start a program → `node.exe`
4. Arguments: `C:\path\to\retrovault\scripts\bg-fetch.mjs`
5. Repeat for other scrapers

**nginx on Windows:**
Download the Windows build from [nginx.org](https://nginx.org/en/download.html). The `nginx.conf.example` syntax works identically.

---

## 🥧 Raspberry Pi (ARM64)

Works great as a low-power always-on server.

### Prerequisites

```bash
# Raspberry Pi OS (64-bit recommended)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs npm

npm install -g pm2
```

### Performance notes

- Pi 4 (4GB+): Runs the full app including scrapers with no issues
- Pi 4 (2GB): Fine for the app; run scrapers on a schedule, not continuously
- Pi 3 or earlier: Works but slower; skip the catalog scraper

### External storage

Consider mounting an external SSD for the `data/` directory — SD cards wear out with frequent writes from the price scraper.

```bash
# Mount external drive at /mnt/retrovault-data
# Edit ecosystem.config.js to point cwd to the external mount
```

The setup is otherwise identical to **Debian/Ubuntu**.

---

## ☁️ Cloud / VPS (DigitalOcean, Linode, Hetzner, etc.)

Any Linux VPS works. The recommended setup:

1. Create a Debian 12 or Ubuntu 22.04 droplet/linode (cheapest tier, $4-6/month)
2. Follow the **Debian/Ubuntu** guide above
3. Point your domain at the VPS IP
4. Set up Cloudflare for free SSL + DDoS protection
5. Enable auth in Settings → Authentication (public internet = enable auth)

For automated deployment on git push, see [deploy.sh](../scripts/deploy.sh).

---

## 🗄️ Database Setup (SQLite)

RetroVault uses SQLite as its database backend. On first install you need to:

### 1. Apply the schema

```bash
npx prisma migrate dev
```

This creates `data/retrovault.db` with the full schema.

### 2. Import existing JSON data (if upgrading from an older version)

If you have existing `data/*.json` files from a previous installation:

```bash
# Preview what will be imported (no writes)
node scripts/migrate-to-sqlite.mjs --dry-run

# Run the migration
node scripts/migrate-to-sqlite.mjs
```

Migration is fast — 26,000+ games with full price history imports in under 1 second. Your JSON files are preserved as backup.

### DATABASE_URL

The default database location is `data/retrovault.db`. Override via `.env`:

```bash
DATABASE_URL="file:./data/retrovault.db"  # default
DATABASE_URL="file:/custom/path/vault.db" # custom path
```

---

## 🗺️ First-Run Setup Wizard

When you open RetroVault for the first time with an empty collection, the **Setup Wizard** launches automatically.

It walks you through:
1. **Mode** — Collector (personal tracking), Dealer (business tools), or Empire Builder (everything)
2. **Collection size** — starter / building / serious (500+ games)
3. **Online selling** — configures eBay/Whatnot tools
4. **Instance type** — solo or shared (recommends auth for shared)
5. **Identity** — your name and currency

The wizard configures feature flags automatically. You can re-run it anytime from **Settings → Features → Restart Setup Wizard**.

After completing the wizard, a guided feature tour launches automatically.

---

## Verifying your installation

After setup, confirm everything is working:

```bash
# Check the app is running
curl http://localhost:3000/api/health

# Check pm2 status
pm2 status retrovault

# Run the test suite
cd retrovault && npm test
```

Open `http://localhost:3000/health` in your browser for a full system status dashboard.

---

## 🔗 Collection Sharing (Public View)

RetroVault lets you share a **read-only public view** of your collection — great for conventions, trading, or just showing off.

### How it works

1. Go to **Share Collection** (Settings area or nav menu)
2. Generate a random **share token** (or type your own)
3. Optionally set a **Base URL** — your public domain, e.g. `https://retrovault.example.com`
4. Click **Save & Generate QR** — your shareable URL is: `https://your-domain.com/public/<token>`

Anyone with the link (or QR code scan) can browse your collection. No account required on their end.

### What's visible to visitors

| Visible | Hidden |
|---|---|
| Game titles, platforms, condition | Prices paid / market values |
| CIB status | Sales history / P&L |
| Collection stats & platform breakdown | Watchlist, business tools |
| Showcase gallery | Personal notes |

### Security model

The public view is protected by **token-based security** — the URL itself is the credential. No passwords, no login.

- Collection-share links are stored as structured `CollectionShare` records in SQLite, with optional expiry timestamps managed by the share API rather than raw config fields
- Visiting `/public/<token>` with a **wrong or missing token** returns a 404 — the page doesn't exist as far as the visitor is concerned
- Visiting a valid token that has **expired** shows a friendly "Link Expired" page instead of the collection
- There is **no rate limiting** on guessing tokens by default, so use a long random token (the built-in generator produces a ~22-char alphanumeric string, which provides ~130 bits of entropy — effectively unguessable)
- To **revoke access**, generate a new token and save. Old links instantly stop working
- To **set an expiry**, choose a duration (7 days, 1 month, 3 months, 1 year, or Never) on the Share page before saving. Saving resets the clock from the current time
- The route bypasses the app's login auth — it's intentionally public, but only to token-holders within the expiry window

### LAN vs. internet sharing

- **LAN only:** Leave Base URL blank. The QR code will reference your local IP. Only people on your network can open it.
- **Internet sharing:** Set Base URL to your public domain and ensure port 80/443 is forwarded or you're using a tunnel (e.g. Cloudflare Tunnel). See the [Cloud / VPS](#️-cloud--vps-digitalocean-linode-hetzner-etc) section.

---

## Getting help

- [GitHub Discussions](https://github.com/theretrovault/retrovault/discussions) — setup help and questions
- [Open an issue](https://github.com/theretrovault/retrovault/issues) — bug reports
- In-app: Settings → Bug Reporting → Report an Issue

---

## 📸 Photo Lookup (experimental)

Field Mode includes an experimental Photo Lookup flow that can OCR a game cover and drop the result into the normal search pipeline.

Current behavior:
- **📷 Take Photo** opens the camera flow on supported phones
- **🖼️ Choose Photo** lets you pick an existing image
- **70%+ confidence** auto-runs the Field Mode search
- **Below 70%** shows candidate buttons and waits for confirmation

Current setup notes:
- The production route reads a Google Vision API key from `/home/apesch/google_vision.txt`
- Google Cloud Vision billing must be enabled on the project behind that key
- Reverse proxies in front of RetroVault may need upload-friendly settings for mobile image posts, including `client_max_body_size`, `proxy_request_buffering off`, and longer proxy timeouts

If Photo Lookup fails, Field Mode still works normally with manual title search.
