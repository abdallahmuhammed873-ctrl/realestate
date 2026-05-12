# Cheque & Key Real Estate Marketplace

Next.js App Router marketplace inspired by OLX/Dubizzle browsing and Property Finder filters, themed around trust, verification, and payments/installments.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS (shadcn-style reusable UI primitives)
- Prisma + PostgreSQL for runtime platform data
- Python AI service for intent extraction, grounded retrieval orchestration, and answer generation

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
- EN/AR-ready chatbot drawer via `POST /api/chat`
- Internal AI data path:
  - Next.js exposes protected internal AI-read endpoints backed by PostgreSQL
  - Python AI service calls those endpoints instead of reading CSV files
  - Ollama stays behind a Python adapter with a grounded fallback response
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
- `POST /api/chat`  
  Body: `{ message, language: "EN" | "AR" }`  
  Response: `{ reply, suggestedFilters, language, extractedFilters, total, items }`
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
- `extras/chatbot/real_estate_chatbot/` Python AI service + Streamlit debug UI

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
5. Start the Next.js app:
   - local laptop only: `npm run dev`
   - same-Wi-Fi demo mode: `npm run dev:network`
   - In development the server now logs the active environment, backend bind host/port, PostgreSQL connection mode, detected network URL, and AI service target once on startup.
6. Start the Python AI service in a second terminal:
   - `cd extras/chatbot/real_estate_chatbot`
   - `pip install -r requirements.txt`
   - `uvicorn api:app --host 127.0.0.1 --port 8001`
   - If Next.js is not running on `http://127.0.0.1:3000`, set `PLATFORM_AI_BASE_URL` before starting the service.
7. Optional debug UI for the AI service:
   - `streamlit run app.py`
8. For same-network mobile testing:
   - use `npm run network:info` to print the current local IPv4 and demo URLs
   - open `http://<laptop-ip>:3000/api/health` from the phone browser to verify backend, DB, and AI reachability
   - call `POST http://<laptop-ip>:3000/api/v1/auth/login` first, then send `Authorization: Bearer <token>` to authenticated `/api/v1/*` routes
   - see `docs/local-network-deployment.md` for the full runbook

## Notes

- Runtime uses PostgreSQL through Prisma-backed service modules.
- Prisma is the primary schema and migration path for runtime data changes.
- Public listing visibility is enforced by repository-level status check (`APPROVED` only).
- The Python AI service reads shared platform data through `app/api/internal/ai/*` and no longer depends on CSV for chat-time retrieval.
- Mobile and browser clients should talk to the Next.js backend only. PostgreSQL is intended to stay backend-only on the laptop for the graduation demo.
- Web auth still uses the current session-cookie flow, while mobile-ready `/api/v1/*` routes now use a signed bearer token issued by `POST /api/v1/auth/login`.
- `GET /api/health` is the main laptop-demo readiness endpoint for backend, database, and AI checks.
