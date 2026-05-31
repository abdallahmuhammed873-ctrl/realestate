# Phase 14 Acceptance Verification

This project now has a dedicated Phase 14 acceptance script for the parts we can verify directly from the shared workspace, plus a short live-demo pass for the environment-dependent checks.

## 1. Offline acceptance check

Run this from the app workspace:

```powershell
npm run test:acceptance
```

This verifies the shared PostgreSQL-backed runtime path end to end:

- seller listing creation with local uploads
- one regular property image plus one `PANORAMA_360` item
- admin approval flow
- website search visibility
- mobile DTO/media URL shaping
- AI-readable retrieval visibility through the shared search path
- canonical price changes reflected across web/mobile/AI-readable surfaces
- bearer-token mobile auth helpers
- current cookie-based web auth flow
- Arabic/English content helpers and direction handling
- theme-sensitive seller/search/home runtime surfaces using the shared theme bootstrap
- PostgreSQL reachability

The script creates a temporary acceptance listing, verifies it, and deletes it at the end.

## 2. Live backend/API verification

To verify the actual HTTP endpoints against a running backend:

```powershell
$env:PHASE14_BASE_URL="http://127.0.0.1:3000"
npm run test:acceptance
```

When `PHASE14_BASE_URL` is set, the script additionally verifies:

- `GET /api/health`
- `POST /api/auth/demo-login`
- `GET /api/me`
- `POST /api/v1/auth/login`
- `GET /api/v1/me`
- `GET /api/v1/properties`
- media file serving from backend absolute URLs
- rendered `lang` / `dir` HTML output for EN and AR requests
- homepage, search page, property page, and seller wizard rendering under EN/AR plus light/dark cookies
- `POST /api/v1/chat` if the backend reports Gemini AI as healthy
- same-network backend and media reachability through the reported laptop IPv4 URL when the backend is running in network mode

If Gemini is not configured, the script reports that as a pending live check instead of pretending the AI answer path was verified.

## 3. Same-network phone verification

These checks are now partly automated and partly manual:

1. Start Next.js in network mode:

```powershell
npm run dev:network
```

2. Print the current laptop IP:

```powershell
npm run network:info
```

3. From the phone browser, verify:
   - `http://<laptop-ip>:3000/api/health`
   - a property media URL returned from `/api/v1/properties`

4. From the mobile app or API client on the phone, verify:
   - `POST http://<laptop-ip>:3000/api/v1/auth/login`
   - `GET http://<laptop-ip>:3000/api/v1/properties`
   - `POST http://<laptop-ip>:3000/api/v1/chat`

When the backend is started in network mode and `PHASE14_BASE_URL` points to the running app, the acceptance script now also probes the laptop IPv4 URL reported by `/api/health` and verifies that:

- the backend responds on that network URL
- `/api/v1/properties` returns absolute media URLs using that network origin
- at least one uploaded property media file is reachable through that same network origin

## 4. Manual UI checks

These are now mostly covered by the live acceptance script, but a quick visual pass is still recommended before the demo:

- dark and light mode on homepage, search, property page, seller wizard, and chatbot drawer
- Arabic and English UI rendering across the same pages
- full phone-on-Wi-Fi reachability from the real mobile client

Use the existing pages plus the acceptance listing flow to complete those manual checks during demo prep.
