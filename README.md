# Cheque & Key Real Estate Marketplace

Next.js App Router marketplace inspired by OLX/Dubizzle browsing and Property Finder filters, themed around trust, verification, and payments/installments.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS (shadcn-style reusable UI primitives)
- Prisma schema for PostgreSQL (with seed script)
- In-memory mocked repository for demo runtime

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
- Optional EN/AR-ready chatbot drawer + API contract (`/api/chat`)
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
- `POST /api/saved-searches`  
  Body: `{ query: Record<string,string> }`
- `POST /api/seller/listings`  
  Body: `{ listingId?, property }`
- `PATCH /api/admin/listings/[id]`  
  Body: `{ status: "APPROVED" | "REJECTED", notes? }`
- `GET /api/properties/by-ids?ids=p-1,p-2`
- `POST /api/chat`  
  Body: `{ message, language: "EN" | "AR" }`  
  Response: `{ reply, suggestedFilters, language }`

## Project Structure

- `app/` routes and API handlers
- `components/` reusable UI and feature modules
- `lib/` types, mock repository, distance/search helpers, auth helpers
- `prisma/` schema and seed

## Setup

1. Install dependencies:
   - `npm install`
2. Copy env:
   - `copy .env.example .env` (Windows)
3. (Optional DB mode) create PostgreSQL DB and run:
   - `npx prisma generate`
   - `npx prisma db push`
   - `npm run seed`
4. Start dev server:
   - `npm run dev`

## Notes

- Runtime currently uses in-memory repository for demo simplicity while Prisma schema/query builder are ready for DB mode.
- Public listing visibility is enforced by repository-level status check (`APPROVED` only).
