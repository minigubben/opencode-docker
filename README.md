# opencode in Docker Compose

Run `opencode` in Docker with explicit host path mounts, plus helper scripts for CLI and web mode.

## What this gives you

- One Docker image built from `opencode-ai` (`npm i -g opencode-ai`)
- `docker compose` services for:
  - `opencode-cli` (interactive terminal UI)
  - `opencode-web` (web client, internal)
  - `auth-proxy` (cookie-authenticated reverse proxy for web access)
- `.env`-driven config for image version, optional extra npm/apt packages, ports, mounted paths, API credentials, and auth-proxy settings
- Simple scripts to start CLI or web quickly

## Quick start

1. Copy env template:

```bash
cp .env.example .env
```

2. Edit `.env` and set at least:
   - `HOST_ALLOWED_PATH` to the host directory you want opencode to access
   - API key(s) for the provider you use (for example `OPENAI_API_KEY`)
   - Optional git identity for commits created in-container:
     - `GIT_AUTHOR_NAME`, `GIT_AUTHOR_EMAIL`
   - `AUTH_PASSWORD` to protect web access
      - `AUTH_COOKIE_SECRET` to sign auth cookies
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

Or target a specific directory for this run:

```bash
./start-cli.sh .
```

When you pass a directory, `start-cli.sh` tries to preserve shared history with web sessions:

- If the directory is inside `HOST_ALLOWED_PATH`, it keeps the same mount root and only changes the container working directory to `/home/node/allowed/<relative-path>`.
- If the directory is outside `HOST_ALLOWED_PATH`, it mounts that directory's parent at `/home/node/allowed` and starts in `/home/node/allowed/<dir-name>`.

Optional: add a shell alias so `opencode` always runs in your current directory mount:

```bash
alias opencode='/absolute/path/to/opencodeDocker/start-cli.sh .'
```

Add it to `~/.bashrc`, then reload with `source ~/.bashrc`.

5. Start web client:

```bash
./start-web.sh
```

Then open `http://localhost:${PORT}` (defaults to `http://localhost:4096`).

You will be redirected to a login page first; after sign-in, the proxy forwards traffic to `opencode-web`.

## Auth behavior

- `auth-proxy` handles login with a password form and stores a signed `HttpOnly` session cookie (`opencode_session`).
- Set `AUTH_SECURE_COOKIE=true` when accessed over HTTPS.

## Script reference

- `start-cli.sh [directory] [opencode args...]` - run CLI interactively; optional first arg sets startup directory and preserves `/home/node/allowed/<path>` layout when possible for shared history
- `start-web.sh` - build and start auth-proxy + web service in background
- `logs.sh [service]` - follow logs (default `opencode-web`)
- `stop.sh` - stop all compose services

## Notes

- The mounted path is your access control boundary: only mount directories you want available inside the container.
- `opencode-web` and `auth-proxy` use `restart: unless-stopped`, so they come back automatically after host or Docker daemon restarts (unless you stopped them manually).
- Persistent opencode directories are stored on the host by default:
  - `./opencode-config` -> `/home/node/.config/opencode`
  - `./opencode-data` -> `/home/node/.local/share/opencode` (includes `auth.json` credentials)
  - `./opencode-state` -> `/home/node/.local/state/opencode`
- Container runs as user `1000:1000` to avoid root-owned files on the host.
