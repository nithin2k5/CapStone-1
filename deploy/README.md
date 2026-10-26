# Running the gateway 24/7

The mailbox sweep runs inside the API process. Signing out of the web app does
not stop it, but anything that stops the API does: a laptop going to sleep, a
closed terminal, a reboot. This directory runs the whole stack on an always-on
host, restarts each service when it fails, and starts again when the host
reboots.

```
             ┌──────────────── host ────────────────┐
internet ──► │ proxy (Caddy, HTTPS) ─┬─ /api/*  ─► api ──► db (MySQL)
             │                       └─ else   ─► web (Next.js)
             └──────────────────────────────────────┘
```

## What you need

- A Linux VM that stays on. 2 GB RAM is enough for one or a few mailboxes.
  Examples: a Google Cloud `e2-small`, an AWS `t3.small`, a DigitalOcean or
  Hetzner 2 GB droplet.
- A domain or subdomain whose DNS A record points at the VM's public IP.
  HTTPS is required: Google and Microsoft refuse OAuth redirects to plain-http
  addresses other than localhost.
- Ports 80 and 443 open in the VM's firewall. Caddy uses port 80 to obtain the
  certificate.

## Steps

1. **Install Docker** on the VM, and make sure it starts on boot:

   ```bash
   curl -fsSL https://get.docker.com | sh
   sudo systemctl enable --now docker
   sudo usermod -aG docker $USER   # then log out and back in
   ```

2. **Get the code:**

   ```bash
   git clone https://github.com/nithin2k5/CapStone-1.git
   cd CapStone-1/deploy
   cp .env.example .env
   ```

3. **Fill in `deploy/.env`.** Every value is explained in the file. At
   minimum: `DOMAIN`, the two database passwords, `JWT_SECRET`,
   `TOKEN_ENCRYPTION_KEY`, `GEMINI_API_KEY`, and the Google OAuth client.

4. **Update the OAuth apps** for the new address:
   - Google Cloud Console → Credentials → your OAuth client: add
     `https://<DOMAIN>` under *Authorised JavaScript origins* and
     `https://<DOMAIN>/api/v1/auth/google/callback` under *Authorised redirect
     URIs*.
   - Google Cloud Console → OAuth consent screen: **publish the app** (move it
     out of *Testing*). While it is in Testing, Google expires refresh tokens
     after 7 days, and scanning stops until you sign in again.
   - Microsoft (if used): add `https://<DOMAIN>` as a redirect URI on the app
     registration.

5. **Start it:**

   ```bash
   docker compose up -d --build
   ```

6. **Connect your mailbox:** open `https://<DOMAIN>` and sign in with Google
   (or Microsoft). Scanning continues after you sign out or close the browser.

## Checking that it is running

```bash
docker compose ps                 # every service should be "running" / "healthy"
docker compose logs -f api        # the sweep logs "Sync (sweep) user=..." each interval
curl https://<DOMAIN>/health
```

A mailbox that can no longer be read logs at error level, for example
`Cannot sync mailbox for user=...` or `refresh token ... was revoked`. That
means the user has to sign in again.

## Updating

```bash
git pull
docker compose up -d --build
```

The database schema is brought up to date by the API at startup.

## Backups

The database lives in the `db_data` Docker volume. Back it up with:

```bash
docker compose exec db sh -c 'mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" seg_db' > seg_db-$(date +%F).sql
```

Keep `TOKEN_ENCRYPTION_KEY` somewhere other than the server. A database backup
is useless for restoring mailbox access without it.
