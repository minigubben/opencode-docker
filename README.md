# opencode in Docker Compose

Run `opencode` in Docker with explicit host path mounts, plus helper scripts for CLI and web mode.

## What this gives you

- One Docker image built from `opencode-ai` (`npm i -g opencode-ai`)
- `docker compose` services for:
  - `opencode-cli` (interactive terminal UI)
  - `opencode-web` (web client)
- `.env`-driven config for image version, optional extra npm/apt packages, ports, mounted paths, API credentials, and web auth
- Simple scripts to start CLI or web quickly

## Quick start

1. Copy env template:

```bash
cp .env.example .env
```

2. Edit `.env` and set at least:
   - `HOST_ALLOWED_PATH` to the host directory you want opencode to access
   - API key(s) for the provider you use (for example `OPENAI_API_KEY`)
   - `OPENCODE_SERVER_PASSWORD` to protect web access (recommended for any network exposure)
   - Optional build extras (space-separated):
     - `OPENCODE_EXTRA_NPM_PACKAGES` (example: `pnpm typescript`)
     - `OPENCODE_EXTRA_APT_PACKAGES` (example: `jq ripgrep`)

3. Make scripts executable (once):

```bash
chmod +x scripts/*.sh
```

4. Start CLI:

```bash
./start-cli.sh
```

5. Start web client:

```bash
./start-web.sh
```

Then open `http://localhost:${PORT}` (defaults to `http://localhost:4096`).

## Script reference

- `start-cli.sh` - run CLI service interactively
- `start-web.sh` - build and start web service in background
- `logs.sh [service]` - follow logs (default `opencode-web`)
- `stop.sh` - stop all compose services

## Notes

- The mounted path is your access control boundary: only mount directories you want available inside the container.
- Persistent opencode directories are stored on the host by default:
  - `./opencode-config` -> `/home/node/.config/opencode`
  - `./opencode-data` -> `/home/node/.local/share/opencode` (includes `auth.json` credentials)
  - `./opencode-state` -> `/home/node/.local/state/opencode`
- Container runs as user `1000:1000` to avoid root-owned files on the host.
