# Localhost setup — Mobile Dog Salon

Use this when an agent (Grok, Composer, etc.) or a human needs the site running locally without guessing ports.

## Two different “localhost” meanings

| Where you work | What `http://localhost:3000` means |
|----------------|-------------------------------------|
| **Your laptop** (Cursor opened the repo locally) | The app on **your machine**. Use the steps below. |
| **Cursor Cloud Agent** (remote VM) | The app on **Cursor’s VM only**. Your phone/laptop `localhost` is **not** that server unless **port forwarding** is on (Desktop → Agents Window → plug icon). |

**Cloud agents:** A `curl` returning `200` inside the VM is success for the agent, not proof the user can open the URL on their device. For the user, use port forwarding, remote desktop on the agent, screenshots, or https://mobiledog-salon.com.

---

## Quick start (real machine — recommended)

From repo root:

```bash
npm install
npm run 67
```

`67` kills the old port, optionally pulls prod data, builds, starts production mode, and opens the browser.

Default URL: **http://localhost:3000**

Admin login: **http://localhost:3000/admin/login** — username `1`, password `1`

---

## If port 3000 is stuck or broken

1. **Do not use `next dev` for “production-like” QA** — it can fight with `next start` and corrupt `.next`.
2. Pick a port (example **3002**) in `.env.local`:

   ```env
   LOCAL_PORT=3002
   ```

3. Clean restart:

   ```bash
   npm run build
   LOCAL_PORT=3002 npm run ensure-local
   ```

4. Verify (Linux/macOS):

   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3002/
   ```

   Expect `200`. Also check one JS chunk is not `400`:

   ```bash
   curl -s http://localhost:3002/ | rg -o '/_next/static/chunks/webpack-[^"]+\.js' | head -1 | xargs -I{} curl -s -o /dev/null -w "%{http_code} {}\n" http://localhost:3002{}
   ```

   Expect `200` for the webpack chunk. If HTML references a chunk that returns **400**, wipe build and rebuild:

   ```bash
   rm -rf .next && npm run build
   ```

---

## Scripts cheat sheet

| Command | Purpose |
|---------|---------|
| `npm run dev` | Next dev server (hot reload). Port 3000 unless `PORT` set. |
| `npm run build` | Production build; **postbuild** runs `ensure-local` on port from `LOCAL_PORT` / `PORT` / `3000` (skipped in CI). |
| `npm run ensure-local` | Restart production server on that port if unhealthy. |
| `npm run 67` / `npm run local` | Full local prod flow (build + start + open browser on Windows/macOS). |
| `npm start` | `next start` — needs existing `.next` build. |

Port resolution: `LOCAL_PORT` → `PORT` → **3000** (see `scripts/ensure-local.mjs`, `scripts/start-local.mjs`).

Logs: `.local-server.log`, PID: `.local-server.pid`, active port: `.local-server.port` (when started via our scripts).

---

## Common failures

### `EADDRINUSE` on 3000

Another `next` process is still listening. Our scripts call `killPort` in `scripts/local-server.mjs`. If it persists:

```bash
# Linux — find listener
lsof -tiTCP:3000 -sTCP:LISTEN
# kill that PID, or use another port:
LOCAL_PORT=3002 npm run ensure-local
```

### Page loads but looks unstyled / login broken

Stale `.next` vs HTML mismatch. Fix:

```bash
rm -rf .next && npm run build
```

### Cloud agent: user “doesn’t see localhost”

Not a build bug. Tell them to open the agent in **Cursor Desktop**, use **port forwarding** (plug icon), or browse via **remote desktop** inside the agent VM at `http://localhost:<port>`.

---

## Agent checklist (copy for Grok)

After any `npm run build`, `verify`, or `qa`:

1. Read port: `cat .local-server.port 2>/dev/null || echo 3000`
2. `curl -s -o /dev/null -w "%{http_code}" http://localhost:<port>/` → **200**
3. If user is on **Cloud Agent**, say explicitly whether they need **port forward** or **3002 on the VM**, not “open localhost on your phone.”
4. If broken, `rm -rf .next && npm run build` then `npm run ensure-local` (with `LOCAL_PORT` if needed).

Production fallback for visual QA: **https://mobiledog-salon.com**
