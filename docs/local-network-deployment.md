# Local Network Deployment Runbook

This project's graduation-demo deployment model is intentionally simple:

- PostgreSQL runs on the laptop only.
- Next.js runs on the laptop and can be exposed to the same Wi-Fi network.
- The Gemini-backed AI assistant runs inside the Next.js server.
- The mobile app talks to the Next.js backend only.

## Current detected laptop IPv4

Checked on **2026-05-13** from this workspace:

- Preferred Wi-Fi IPv4: `192.168.1.4`
- Secondary private IPv4 also present: `192.168.56.1`

Use `192.168.1.4` for phone testing on the current Wi-Fi network. If the laptop changes networks, run `npm run network:info` again because the IP may change.

## Runtime commands

Install and prepare the app normally, then use the network-aware scripts for demo testing:

```powershell
npm run dev:network
```

Or for a production-style local demo build:

```powershell
npm run build
npm run start:network
```

These scripts bind Next.js to `0.0.0.0:3000`, which makes the backend reachable from other devices on the same network.

## Gemini AI

Set the Gemini API key in the Next.js environment before starting the app:

```powershell
$env:GEMINI_API_KEY="your-key"
$env:GEMINI_MODEL="gemini-3.5-flash"
$env:GEMINI_FALLBACK_MODELS="gemini-2.5-flash"
```

The browser and mobile clients still call Next.js only. Gemini is called server-side from `app/api/ai/*`.
When the primary model returns a Gemini quota/rate-limit error, the server retries with the configured fallback models in order.

## Demo URLs

With the current Wi-Fi address and default ports:

- Laptop web app: `http://127.0.0.1:3000`
- Phone/mobile backend base URL: `http://192.168.1.4:3000`
- Backend health endpoint from phone: `http://192.168.1.4:3000/api/health`
- AI health endpoint: `http://192.168.1.4:3000/api/ai/health`

## Health checks

Use these endpoints to verify the laptop demo stack:

- `GET /api/health`
  - confirms the backend is reachable
  - reports the current bind host/port
  - checks PostgreSQL reachability from Next.js
  - checks Gemini configuration
- `GET /api/ai/health`
  - reports database and Gemini readiness for the assistant

You can also print the current local IPs and URLs from the app workspace:

```powershell
npm run network:info
```

## Firewall note

If the phone cannot reach `http://192.168.1.4:3000` while the laptop browser can, Windows Firewall is the most likely blocker. Allow inbound TCP on port `3000` for the current network profile or allow the Node.js process when Windows prompts for access.

One manual PowerShell option is:

```powershell
New-NetFirewallRule -DisplayName "ChequeKey Next.js Demo 3000" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000
```

Only do this on the laptop used for the graduation demo.

## Boundaries

- PostgreSQL should remain bound for local/backend use only.
- The phone should never connect directly to PostgreSQL.
- The phone should never call Gemini directly.
- This setup is demo-friendly, not production-grade.
- The laptop must stay powered on and connected to the same network as the phone.
