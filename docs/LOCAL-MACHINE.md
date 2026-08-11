# Work on your computer (not Cloud Agent)

Use this when you want **real localhost on your machine** — the browser opens **your** `http://localhost:3000`, not a remote VM.

Cloud Agents cannot install or run servers on your laptop. **Local Cursor** can.

---

## One-time setup

### 1. Open the repo locally in Cursor

Do **not** use “Run as Cloud Agent” for day-to-day site work.

1. **File → Open Folder** (or clone first):
   ```powershell
   git clone https://github.com/lowdifficulty/mobile-dog-salon.git
   ```
2. Open that folder in **Cursor Desktop** on your PC/Mac.

You should see the project in the sidebar and a terminal that runs **on your computer** (check the path — e.g. `C:\Users\...` or `/Users/...`, not a cloud-only workspace).

### 2. Node.js

Install **Node 20+** (22 LTS is fine): https://nodejs.org/

Verify in Cursor’s terminal:

```powershell
node -v
npm -v
```

### 3. Install dependencies

In the project root:

```powershell
npm install
```

Optional: pull production env for Redis/booking data (needs Vercel CLI logged in):

```powershell
npx vercel link
npx vercel env pull .env.local --environment=production
```

Without Redis vars, scheduling may be empty locally; the site still runs.

---

## Start localhost (every day)

### Windows (recommended)

```powershell
npm run 67
```

- Stops anything on port 3000 (or `LOCAL_PORT` in `.env.local`)
- Builds the site (~1–2 min)
- Starts production server
- Opens your browser to **http://localhost:3000**

**Optional:** type `67` from anywhere after one-time install:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-67.ps1
```

Open a **new** terminal, then type: `67`

### Mac / Linux

```bash
npm run 67
# or
npm run local
```

---

## Logins (local)

| Area | URL | Credentials |
|------|-----|-------------|
| Admin | http://localhost:3000/admin/login | username `1`, password `1` |
| Groomer (Melanie) | http://localhost:3000/groomer/login | `melanie` / team password |
| Client portal | http://localhost:3000/client/login | test accounts as configured |

---

## If localhost breaks

```powershell
rm -rf .next          # Mac/Linux
# Windows PowerShell:
Remove-Item -Recurse -Force .next

npm run build
npm run ensure-local
```

Unstyled page or login broken → almost always stale `.next`; clean rebuild fixes it.

Port busy → add to `.env.local`:

```env
LOCAL_PORT=3002
```

Then:

```powershell
npm run ensure-local
node scripts/print-local-url.mjs
```

---

## Use AI on your machine

In the **local** workspace:

- **Chat / Agent** runs against your files; terminal commands run **on your PC**.
- Ask: “Run `npm run 67` and confirm localhost returns 200.”
- Avoid **Cloud Agent** when the goal is “localhost on my computer.”

Deploy to production when ready:

```powershell
npm run 42
```

(requires git clean, Vercel/GitHub auth)

---

## Quick reference

| Goal | Command |
|------|---------|
| Dev with hot reload | `npm run dev` → http://localhost:3000 |
| Prod-like local (best QA) | `npm run 67` |
| Restart after build | `npm run ensure-local` |
| Print active URL | `node scripts/print-local-url.mjs` |
| Live site | https://mobiledog-salon.com |

More detail: [LOCALHOST.md](./LOCALHOST.md)
