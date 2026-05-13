# Unified Real Estate Platform Checklist

## Recommended Architecture

- [ ] Use **one source of truth for business data**: PostgreSQL.
- [ ] Keep **Next.js** as the main product backend and frontend.
- [ ] Keep the **Python project** as the AI engine only, not as a second property datastore.
- [ ] Keep the **current auth logic**.
- [ ] Use a **single PostgreSQL data path** for the platform and the AI integration.
- [ ] Run the project in a **local laptop-server setup** for the graduation demo:
  - PostgreSQL runs on the laptop
  - Next.js backend runs on the laptop
  - Python AI service runs on the laptop
  - mobile app calls the laptop backend over the same network
- [ ] Store **all media locally on disk** and save only relative file paths in the database.
- [ ] Support **regular photos + 360 panorama media** in the first MVP.
- [x] Expose **versioned JSON APIs** from Next.js for both web and mobile.

## What I Found In The Current Code

- [x] The Next.js runtime still uses `.demo-db.json` through `lib/repository.ts` instead of Prisma-backed PostgreSQL.
- [x] The Prisma schema is only a partial match for the real runtime model.
- [x] The Python AI project read from `real_estate_master.csv` and stored chat history in local JSON, so it had its own separate dataset.
- [x] `/api/chat` in Next.js was a stub and is now proxied to the Python AI service.
- [ ] The current i18n layer is only partial: the language provider is hard-coded to English and the root layout is fixed to `lang="en"` and `dir="ltr"`.
- [ ] There is no real dark/light theme system yet.
- [ ] Property images are currently remote URLs or base64 data URLs, not local uploaded files.

## Non-Negotiable Rules For The Final Build

- [ ] Do **not** keep CSV as a runtime source once integration starts.
- [ ] Do **not** let Python and Next.js maintain different filtering/business rules for the same inventory.
- [ ] Do **not** keep storing property photos as base64 strings in JSON/database records.
- [x] Do **not** build the mobile app directly on page-specific web APIs without versioning and token auth.
- [ ] Do **not** let the mobile app connect directly to PostgreSQL.
- [ ] Do **not** expose DB credentials or AI-service internals to the mobile app.

## Phase 1 - Lock The Canonical Data Model

- [x] Expand Prisma so it matches the actual runtime behavior before any feature work continues.
- [x] Keep the existing core tables: `User`, `Listing`, `Property`, `Favorite`, `Appointment`, `SavedSearch`.
- [x] Extend `User` with the fields already used by runtime logic:
  - `passwordHash` or keep the current password field temporarily, then migrate cleanly later
  - `avatarPath`
  - `blocked`
  - `isCompanyAccount`
  - `companyOwnerId`
- [x] Extend `Listing` with:
  - `feesPaid`
  - review metadata already used by admin flow
- [x] Extend `Property` so AI-imported inventory can live in the same model:
  - `projectName`
  - `unitCode`
  - `inventoryStatus`
  - `pricePerSqm`
  - `landArea`
  - `gardenArea`
  - `roofArea`
  - `hasGarden`
  - `hasRoof`
  - `sourceType`
  - `sourceFile`
  - `sourceSheet`
- [x] Add a `PropertyMedia` table instead of depending only on `images: string[]`.
- [x] Add missing community entities because they already exist in runtime logic:
  - `CommunityPost`
  - `CommunityPostLike`
  - `CommunityPostComment`
  - `CommunityPostCommentLike`
  - `CommunityListingLike`
  - `CommunityListingComment`
  - `CommunityListingCommentLike`
- [x] Add a `SellerMessage` table if seller/buyer messaging is staying in scope.
- [x] Add a `PasswordResetToken` table instead of keeping reset state only in memory/JSON.
- [x] Update appointment modeling to cover the current runtime behavior:
  - support `RESCHEDULED`
  - support suggested slots
- [x] Keep compare lists in `localStorage` for MVP unless cross-device sync becomes a must-have.
- [x] Keep notification rows derived/computed for MVP if that is faster than adding a dedicated notification table.

## Phase 2 - Replace Demo Storage In The Next.js App

- [x] Split `lib/repository.ts` into smaller server-side modules before switching implementations:
  - `user-service`
  - `listing-service`
  - `property-service`
  - `appointment-service`
  - `community-service`
  - `notification-service`
  - `ai-read-service`
- [x] Keep route handler contracts as stable as possible so the frontend does not break during migration.
- [x] Replace `.demo-db.json` reads/writes with Prisma queries.
- [x] Create one migration script to import current `.demo-db.json` into PostgreSQL.
- [x] Seed initial users/listings/properties from the migrated data, not only from `mock-data.ts`.
- [x] Remove disk persistence logic that only exists for demo mode.
- [x] Add repository/service-level tests for the migrated search, favorites, appointments, admin approval, and seller listing flows.
- [x] Keep one clear server-side data access boundary so route handlers do not query the database ad hoc.

## Phase 3 - Merge The AI Inventory Into The Same Platform Data

- [x] Treat the CSV/Excel inventory as **input data**, not as a second runtime database.
- [x] Decide the mapping rule: each imported CSV row becomes one `Property`/unit record in PostgreSQL.
- [x] Keep an import source flag so imported inventory and seller-created inventory can coexist.
- [x] Create one import pipeline:
  - raw Excel files
  - normalize fields
  - upsert into PostgreSQL
  - mark source metadata
- [x] Reuse the existing Python preprocessing knowledge, but change its output target from CSV to PostgreSQL upsert payloads.
- [x] Create a dedicated developer/system owner for imported inventory if the imported rows do not belong to normal seller accounts yet.
- [x] Normalize imported project names so AI queries like `Aliva`, `LVLS`, `New Cairo`, `roof`, and `garden` can be answered from the same main database.
- [x] Ensure imported units respect listing visibility rules:
  - public assistant sees only approved/public records
  - admin tools can see pending/rejected records through protected endpoints

## Phase 4 - Refactor The Python AI Project Into A Real AI Service

- [x] Keep Python, but narrow its responsibility to:
  - intent extraction
  - grounded retrieval orchestration
  - LLM answer generation
- [x] Remove CSV as a runtime dependency from the AI chat path.
- [x] Keep Streamlit only as an internal debugging UI, or retire it after the new API is ready.
- [x] Add a proper Python service layer with endpoints such as:
  - `GET /health`
  - `POST /chat`
  - `POST /extract-filters`
- [x] Keep the current LLM provider behind an adapter so Ollama can stay for MVP and be swapped later.
- [x] Change AI retrieval to use the shared platform data instead of pandas CSV filtering.
- [x] Recommended MVP retrieval path:
  - Python calls internal Next.js AI read endpoints backed by PostgreSQL
  - Python never reads a separate property file
- [x] Add an internal shared search contract so AI filters map directly to platform filters.
- [x] Return structured filters from AI, not only plain text.
- [x] Validate extracted filters before querying:
  - Python: Pydantic
  - Next.js: Zod or server-side validation
- [x] Keep all answers grounded:
  - the model only sees retrieved database-backed rows
  - if nothing matches, the answer must say so clearly
- [x] Update Next.js `/api/chat` so it proxies to the Python AI service instead of returning a stub response.

## Phase 5 - Canonical Search Contract Shared By Web, AI, And Mobile

- [x] Define one filter schema that is used everywhere:
  - `transaction`
  - `type`
  - `city`
  - `area`
  - `district`
  - `projectName`
  - `minPrice`
  - `maxPrice`
  - `minArea`
  - `maxArea`
  - `minBeds`
  - `maxBeds`
  - `minBaths`
  - `maxBaths`
  - `paymentType`
  - `completionStatus`
  - `hasGarden`
  - `hasRoof`
  - `downPaymentMax`
  - `installmentYearsMax`
  - `installmentMonthlyMax`
  - `sort`
  - `page`
  - `pageSize`
- [x] Keep one canonical server-side search implementation in the Next.js backend/service layer.
- [x] Make AI reuse that search contract instead of inventing its own pandas rules.
- [x] If needed, add internal AI-only fields like `unitCode` and `inventoryStatus`, but keep them versioned and documented.

## Phase 6 - Solidify The PostgreSQL Data Layer

- [x] Keep PostgreSQL as the real database engine.
- [x] Keep Prisma as the primary schema and migration tool.
- [x] Keep the current app auth/session logic unchanged while the data layer is migrated.
- [x] Centralize business rules in Next.js server code and shared services.
- [x] Keep high-churn custom business logic in app server code, not duplicated in clients.
- [x] Log the active environment and database connection mode clearly in development.
- [x] Use local PostgreSQL on the laptop for development/demo unless the team later decides to host it elsewhere.
- [x] Keep PostgreSQL accessible only to local backend/services, not directly to phones.

## Phase 7 - Local Network Deployment Model

- [x] Run the Next.js backend on the laptop in a way that is reachable from other devices on the same Wi-Fi network.
- [x] Configure the backend server to bind to `0.0.0.0`, not only `localhost`.
- [x] Determine and document the laptop's local IPv4 address for testing.
- [x] Open/allow the backend port in the laptop firewall if needed.
- [x] Keep PostgreSQL bound for local/backend use only unless there is a very specific reason to expose it.
- [x] Run the Python AI service on the same laptop and let the backend call it locally.
- [x] Make the backend call the AI service internally on the laptop instead of letting the mobile app call the AI service directly.
- [x] Document the expected local URLs for demo/testing, for example:
  - web app on laptop
  - backend API on `http://<laptop-ip>:<port>`
  - AI service on local internal port
- [x] Add simple health endpoints so the team can quickly verify:
  - backend is reachable from phone
  - AI service is reachable from backend
  - database is reachable from backend
- [x] Accept that this deployment model is demo-friendly, not production-grade:
  - laptop must stay on
  - laptop and phone must stay on the same network
  - laptop IP may change between networks
## Phase 8 - Mobile-Ready API Layer

- [x] Create `/api/v1/*` endpoints instead of exposing only web-era route shapes.
- [x] Make mobile use bearer token auth, not cookie-based demo auth.
- [x] Keep response DTOs stable and UI-agnostic.
- [x] Add these mobile-ready endpoints first:
  - `GET /api/v1/me`
  - `GET /api/v1/properties`
  - `GET /api/v1/properties/:id`
  - `POST /api/v1/favorites/toggle`
  - `GET /api/v1/favorites`
  - `POST /api/v1/appointments`
  - `GET /api/v1/appointments`
  - `GET /api/v1/notifications`
  - `POST /api/v1/chat`
- [x] Keep web pages free to call server-side services directly, but make mobile consume the versioned API only.
- [x] Return absolute media URLs for the mobile app.
- [x] Keep pagination and filter semantics identical between web and mobile.

## Phase 9 - Local Media Storage

- [x] Replace base64 image submission with multipart upload.
- [x] Save local files under a predictable structure such as:
  - `public/uploads/properties/{propertyId}/...`
  - `public/uploads/avatars/{userId}/...`
  - `public/uploads/community/{postId}/...`
- [x] Save only relative paths in PostgreSQL.
- [x] Add upload validation:
  - max file size
  - allowed image MIME types
  - file count limit
- [x] Generate safe filenames to avoid collisions.
- [x] Add delete/replace cleanup logic so old local files do not accumulate forever.
- [x] Update seller listing creation/edit flow to upload files to backend before final save.
- [x] Update profile and community image flows to use the same local upload path if those features remain.

## Phase 10 - 360 Media Support

- [ ] Use the simplest graduation-project-friendly 360 approach first:
  - regular photos remain supported
  - optional `PANORAMA_360` media is added for interactive viewing
- [ ] Model media kinds in `PropertyMedia`:
  - `IMAGE`
  - `PANORAMA_360`
  - optional later: `SPIN_360_FRAME`
- [ ] Add `sortOrder`, `label`, and language-friendly alt text fields for media items.
- [ ] Update the seller UI so a property can upload:
  - normal photos
  - one or more 360 panorama files
- [ ] Update the property page gallery logic:
  - show photo carousel for normal photos
  - show a 360 viewer when panorama media exists
- [ ] Keep the first version lightweight and avoid jumping to full 3D/three.js unless absolutely required.
- [ ] If the team later wants exterior spin-rotation instead of panorama, add frame-set support as a second step, not in the first MVP.

## Phase 11 - Dark/Light Theme

- [ ] Add a real theme provider with persisted user preference.
- [ ] Respect system preference on first load.
- [ ] Add a theme toggle in both desktop and mobile navigation.
- [ ] Convert color usage to semantic design tokens instead of hard-coded white/slate classes everywhere.
- [ ] Audit the following components first because they currently rely on light styling:
  - top navigation
  - cards
  - modals
  - chatbot drawer
  - seller listing wizard
  - admin tables/lists
  - property detail page
- [ ] Make map areas, overlays, borders, badges, and shadows readable in both themes.

## Phase 12 - Arabic/English Support

- [ ] Replace the current no-op language provider with a real client/server language state.
- [ ] Drive `<html lang>` and `<html dir>` from the selected language.
- [ ] Store the selected language in cookie/local storage and hydrate it correctly.
- [ ] Move translations into a structured dictionary layout by feature area.
- [ ] Translate all static UI labels across:
  - public pages
  - seller pages
  - admin pages
  - chatbot UI
  - validation messages
- [ ] Make all layouts RTL-safe when Arabic is selected.
- [ ] Use canonical codes for controlled values and translate only at presentation time:
  - cities
  - areas
  - districts
  - property types
  - payment types
  - statuses
- [ ] For property content fields, support bilingual values with fallback:
  - `titleEn`
  - `titleAr`
  - `descriptionEn`
  - `descriptionAr`
- [ ] If bilingual manual entry is too heavy, allow one source language plus optional assisted translation later, but keep stored fields explicit.
- [ ] Make AI responses language-aware and keep the answer language aligned with the UI/app request.

## Phase 13 - Update The Seller/Admin Flows To Match The New Architecture

- [ ] Keep seller creation/edit approval flows working after the DB migration.
- [ ] Add local media upload to seller listing creation/edit flow.
- [ ] Add project/unit fields to seller/admin forms only where they are truly needed.
- [ ] Keep imported inventory and manually created listings distinguishable for admin review.
- [ ] Ensure approval state changes affect:
  - public website visibility
  - mobile API visibility
  - AI retrieval visibility

## Phase 14 - Verification Scenarios

- [ ] Seller creates a listing with local photos and one 360 panorama.
- [ ] Admin approves the listing.
- [ ] The property appears in website search using the DB-backed search service.
- [ ] The same property appears from the mobile `/api/v1/properties` endpoint.
- [ ] The AI assistant can answer about that property without touching CSV files.
- [ ] Changing a price in the main DB is reflected in web, mobile, and AI without manual re-export.
- [ ] Arabic and English both work for UI text and assistant replies.
- [ ] Dark and light mode both render correctly on the homepage, search page, property page, seller wizard, and chatbot drawer.
- [ ] Login works with the current auth logic on web and mobile-compatible API flows.
- [ ] The app reads and writes correctly through the single PostgreSQL path.
- [ ] The AI service answers correctly from the same shared PostgreSQL-backed platform data.
- [ ] The mobile app can reach the backend from the phone using the laptop local IP on the same network.
- [ ] The backend can reach PostgreSQL and the AI service locally on the laptop.
- [ ] Media URLs returned to the phone load correctly from the laptop server on the same network.

## MVP Cut Line If Time Gets Tight

- [ ] Must finish first:
  - PostgreSQL as source of truth
  - Next.js migration off `.demo-db.json`
  - Python AI reading shared platform data
  - same-network laptop-server mobile access
  - local media uploads
  - mobile-ready `/api/v1` core property endpoints
  - real AR/EN toggle
  - dark/light theme
- [ ] Can come after core integration if needed:
  - advanced multi-room 360 tours
  - exterior spin-frame 360
  - deeper admin analytics

## Final Cleanup

- [ ] Remove or archive the old CSV runtime dependency from the AI app.
- [ ] Remove or archive the old `.demo-db.json` runtime path from the Next.js app.
- [ ] Remove demo-cookie-only auth from production routes.
- [ ] Move secrets out of tracked files and rotate anything that has already been committed/shared.
- [ ] Update README files so new teammates can run:
  - PostgreSQL
  - Next.js app
  - Python AI service
  - same-network mobile testing against the laptop backend

## Recommended Implementation Order

- [x] Phase 1: canonical schema
- [x] Phase 2: migrate Next.js runtime to PostgreSQL
- [x] Phase 3: import AI inventory into PostgreSQL
- [x] Phase 4: refactor Python into AI-only service
- [x] Phase 5: shared search contract
- [x] Phase 6: solidify PostgreSQL data layer
- [x] Phase 7: local network deployment model
- [x] Phase 8: versioned mobile API
- [x] Phase 9: local media upload
- [ ] Phase 10: 360 panorama support
- [ ] Phase 11: dark/light theme
- [ ] Phase 12: AR/EN support
- [ ] Phase 13: acceptance verification and cleanup
