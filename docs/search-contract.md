# Shared Search Contract

Phase 5 defines one canonical property-search filter contract for every platform surface:

- Next.js web search
- Next.js internal AI search endpoint
- Python AI service requests
- Future mobile `/api/v1/properties` work

## Canonical Filters

Core shared filters:

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

Supported runtime extensions already used by the current app and preserved in the same contract:

- `q`
- `furnishing`
- `amenities`
- `lat`
- `lng`
- `distanceKm`

Internal AI-only extensions:

- `unitCode`
- `inventoryStatus`

## Rules

- Public search requests use the shared contract without AI-only fields.
- Internal AI requests use the same shared contract plus `unitCode` and `inventoryStatus`.
- `page` defaults to `1`.
- `pageSize` defaults to `20` for the app contract and is capped at `50`.
- `sort` defaults to `FEATURED`.
- `min*` values cannot exceed their matching `max*` values.
- `lat` and `lng` must be sent together.
- `distanceKm` and `DISTANCE_ASC` require both `lat` and `lng`.

## Server Authority

The canonical runtime path is:

1. Parse and validate filters with `lib/search-contract.ts`
2. Execute property search through the Next.js service layer
3. Reuse the same normalized filter payload from the Python AI service

This keeps search behavior centralized in the Next.js backend instead of duplicating business rules in clients or the AI layer.
