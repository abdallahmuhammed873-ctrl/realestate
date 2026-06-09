# Cheque & Key Real Estate Marketplace

Next.js App Router marketplace inspired by OLX/Dubizzle browsing and Property Finder filters, themed around trust, verification, and payments/installments.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS (shadcn-style reusable UI primitives)
- Prisma + PostgreSQL for runtime platform data
- Google Gemini via the Next.js server for grounded AI search, comparison, and answer generation
- Gemini Live voice sessions through short-lived server-issued tokens

## Features

- Advanced multi-facet search with server-side filtering:
  - transaction (buy/rent/vacation), type, hierarchical location
  - min/max price, area, beds/baths
  - cash/installments + installment constraints
  - furnishing, completion, amenities, keyword
  - distance filter with Haversine (`lat/lng + distanceKm`)
  - sorting + pagination (default 20 per page)
- Deep-linkable filters in URL query params
- Verified listing workflow:
  - seller submit/edit => `PENDING`
  - admin approve/reject with notes
  - only `APPROVED` listings visible in public pages and search
- Favorites, compare (localStorage up to 4), recommendations
- Appointment booking flow + notification stub response
- Saved search alerts
- EN/AR-ready chatbot drawer via `POST /api/ai/chat`
- Live voice assistant in the chatbot drawer via Gemini Live
- Internal AI data path:
  - Next.js extracts filters, searches PostgreSQL-backed listings, and calls Gemini server-side
  - AI responses return real property cards from canonical platform data
  - Optional Gemini Google Search grounding is used for explicit external market-context requests and no-local-results fallback
  - Browser voice sessions use `/api/ai/live/session` ephemeral tokens and `/api/ai/live/tool` for grounded platform/external search
- Responsive UX:
  - mobile bottom nav
  - mobile filters bottom sheet
  - sticky desktop filters
  - loading skeleton for search

## Demo Credentials

Use `/auth` and choose role:

- Buyer: `buyer@example.com`
- Seller: `seller@example.com`
- Admin: `admin@example.com`

## Routes

### Public
- `/` Home
- `/search` Results + filters
- `/p/[id]` Property details
- `/compare`
- `/favorites`
- `/buyer/appointments`
- `/auth`

### Seller
- `/seller/dashboard`
- `/seller/new`
- `/seller/listings/[id]/edit`

### Admin
- `/admin`
- `/admin/pending`
- `/admin/listings/[id]`

## API Contract

- `POST /api/auth/demo-login`  
  Body: `{ identifier, role }`
- `GET /api/search?...query`
- `POST /api/favorites/toggle`  
  Body: `{ propertyId }`
- `POST /api/appointments`  
  Body: `{ propertyId, datetime, contactName, contactPhone, notes? }`
- `PATCH /api/seller/appointments/[id]`  
  Body: `{ action: "APPROVE" | "DENY" | "RESCHEDULE", slots?: string[] }`
- `PATCH /api/buyer/appointments/[id]`  
  Body: `{ datetime }` (must match one suggested slot)
- `POST /api/saved-searches`  
  Body: `{ query: Record<string,string> }`
- `POST /api/seller/listings`  
  Body: `{ listingId?, property }`
- `PATCH /api/admin/listings/[id]`  
  Body: `{ status: "APPROVED" | "REJECTED", notes? }`
- `GET /api/properties/by-ids?ids=p-1,p-2`
- `GET /api/health`
- `POST /api/ai/chat`
  Body: `{ message, language: "EN" | "AR" }`  
  Response: `{ reply, suggestedFilters, language, extractedFilters, total, items }`
- `GET /api/ai/health`
- `POST /api/v1/auth/login`
  Body: `{ identifier, password, role? }`
  Response: `{ ok, accessToken, tokenType: "Bearer", expiresAt, user }`
- `GET /api/v1/me`
- `GET /api/v1/properties?...filters`
- `GET /api/v1/properties/:id`
- `GET /api/v1/favorites`
- `POST /api/v1/favorites/toggle`
  Body: `{ propertyId }`
- `GET /api/v1/appointments`
- `POST /api/v1/appointments`
  Body: `{ propertyId, datetime, contactName, contactPhone, notes? }`
- `GET /api/v1/notifications`
- `POST /api/v1/chat`

## Project Structure

- `app/` routes and API handlers
- `components/` reusable UI and feature modules
- `lib/` types, Prisma-backed services, AI contract, distance/search helpers, auth helpers
- `prisma/` schema and seed
- `app/api/ai/*` Gemini-backed AI endpoints

## Setup

1. Install dependencies:
   - `npm install`
2. Copy env:
   - `copy .env.example .env` (Windows)
3. Create a local PostgreSQL database on the laptop and set `DATABASE_URL`.
4. Apply Prisma schema and seed runtime data:
   - `npx prisma generate`
   - `npx prisma migrate deploy`
   - `npm run seed`
5. Configure Gemini:
   - set `GEMINI_API_KEY` in `.env`
   - optional: set `GEMINI_MODEL` (default `gemini-3.5-flash`)
   - optional: set `GEMINI_FALLBACK_MODELS` as a comma-separated list for quota/rate-limit/high-demand fallback (default `gemini-2.5-flash,gemini-2.5-flash-lite`)
   - optional: set `GEMINI_LIVE_MODEL`, `GEMINI_LIVE_VOICE`, and `GEMINI_LIVE_TOKEN_MINUTES` for the live voice assistant
6. Start the Next.js app:
   - local laptop only: `npm run dev`
   - same-Wi-Fi demo mode: `npm run dev:network`
   - In development the server now logs the active environment, backend bind host/port, PostgreSQL connection mode, detected network URL, and AI service target once on startup.
7. For same-network mobile testing:
   - use `npm run network:info` to print the current local IPv4 and demo URLs
   - open `http://<laptop-ip>:3000/api/health` from the phone browser to verify backend, DB, and AI reachability
   - call `POST http://<laptop-ip>:3000/api/v1/auth/login` first, then send `Authorization: Bearer <token>` to authenticated `/api/v1/*` routes
   - see `docs/local-network-deployment.md` for the full runbook
8. Run acceptance verification:
   - offline shared-data verification: `npm run test:acceptance`
   - live backend/API verification: set `$env:PHASE14_BASE_URL="http://127.0.0.1:3000"` first, then run `npm run test:acceptance`
   - see `docs/acceptance-verification.md` for the full Phase 14 checklist runbook

## Notes

- Runtime uses PostgreSQL through Prisma-backed service modules.
- Prisma is the primary schema and migration path for runtime data changes.
- Public listing visibility is enforced by repository-level status check (`APPROVED` only).
- The AI assistant reads shared platform data directly through Next.js service modules and no longer depends on Python/Ollama.
- The live voice assistant uses Gemini Live with ephemeral tokens; the browser never receives the long-lived Gemini API key.
- Mobile and browser clients should talk to the Next.js backend only. PostgreSQL is intended to stay backend-only on the laptop for the graduation demo.
- Web auth still uses the current session-cookie flow, while mobile-ready `/api/v1/*` routes now use a signed bearer token issued by `POST /api/v1/auth/login`.
- `GET /api/health` is the main laptop-demo readiness endpoint for backend, database, and AI checks.
- `npm run test:acceptance` is the canonical Phase 14 verification entrypoint for shared-data acceptance checks.
