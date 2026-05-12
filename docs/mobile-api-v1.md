# Mobile API v1

`/api/v1/*` is the mobile-ready API surface for the graduation project. It keeps the web app on its current server-side service path while giving the phone a versioned JSON contract with bearer-token auth.

## Auth

1. `POST /api/v1/auth/login`
2. Send `Authorization: Bearer <accessToken>` on authenticated requests

Example login body:

```json
{
  "identifier": "buyer@example.com",
  "password": "123456",
  "role": "BUYER"
}
```

## Endpoints

- `GET /api/v1/me`
- `GET /api/v1/properties`
- `GET /api/v1/properties/:id`
- `GET /api/v1/favorites`
- `POST /api/v1/favorites/toggle`
- `GET /api/v1/appointments`
- `POST /api/v1/appointments`
- `GET /api/v1/notifications`
- `POST /api/v1/chat`

## Notes

- Property list filters and pagination are intentionally the same as the existing web search contract.
- Property and avatar media are returned as absolute URLs in v1 responses so devices on the same Wi-Fi can load them directly from the laptop backend.
- Web pages still use server-side services and cookie auth; the mobile app should use the versioned API and bearer tokens only.
