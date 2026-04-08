# Pokerank API — Frontend Integration Guide

> **Base URL:** `{host}/api/v1`
> **Content-Type:** `application/json` (unless specified as `multipart/form-data`)
> **Rate Limit:** 100 requests / 60 seconds

---

## Response Wrapper

Every response follows a consistent envelope:

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 386, "totalPages": 20 },
  "timestamp": "2026-04-06T12:00:00.000Z"
}
```

> `meta` is only present on paginated endpoints.

### Error Response

```json
{
  "success": false,
  "error": {
    "statusCode": 400,
    "message": "Validation failed",
    "code": "VALIDATION_ERROR"
  },
  "timestamp": "2026-04-06T12:00:00.000Z"
}
```

---

## Authentication

Protected endpoints require:

```
Authorization: Bearer <accessToken>
```

Public endpoints are marked with **PUBLIC**. All others require a valid JWT.

---

## Table of Contents

1. [Auth — Registration Flow](#1-auth--registration-flow)
2. [Auth — Login](#2-auth--login)
3. [Auth — Social Login (Firebase)](#3-auth--social-login-firebase)
4. [Auth — Forgot Password](#4-auth--forgot-password)
5. [Auth — Token & Session](#5-auth--token--session)
6. [User Profile](#6-user-profile)
7. [Settings — Notifications, Password, Delete Account](#7-settings--notifications-password-delete-account)
8. [Content — Terms, Privacy, Help (Public)](#8-content--terms-privacy-help-public)
9. [Support Tickets (Auth)](#9-support-tickets-auth)
10. [Pokédex (Public)](#10-pokédex-public)
11. [Rankings (Public)](#11-rankings-public)
12. [Raids & Counter (Public + Auth)](#12-raids--counter-public--auth)
13. [Name Generator (Public + Auth)](#13-name-generator-public--auth)
14. [Ranking History (Auth)](#14-ranking-history-auth)
15. [Recommendations (Auth)](#15-recommendations-auth)
16. [Events (Public)](#16-events-public)
17. [Admin — Events (Admin Only)](#17-admin--events-admin-only)
18. [Admin — Content (Admin Only)](#18-admin--content-admin-only)
19. [Admin — Tickets (Admin Only)](#19-admin--tickets-admin-only)
20. [Files (Auth)](#20-files-auth)

---

## 1. Auth — Registration Flow

### Step 1 — Register

`POST /auth/register` — **PUBLIC**

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "Test@12345"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `email` | `string` | Yes | Valid email format |
| `password` | `string` | Yes | Min 8 chars, 1 uppercase, 1 number, 1 special char (`@$!%*?&#`) |

**Response (`data`):**

```json
{
  "message": "OTP sent to your email",
  "email": "user@example.com"
}
```

---

### Step 2 — Verify OTP

`POST /auth/verify-otp` — **PUBLIC**

**Request Body:**

```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `email` | `string` | Yes | Valid email |
| `code` | `string` | Yes | Exactly 6 digits |

**Response (`data`):**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "665f1a2b3c4d5e6f7a8b9c0d",
    "email": "user@example.com",
    "role": "user",
    "isEmailVerified": true,
    "isProfileComplete": false,
    "firstName": null,
    "lastName": null,
    "phoneNumber": null,
    "dateOfBirth": null,
    "profileImage": null,
    "subscriptionTier": "free"
  }
}
```

---

### Resend OTP

`POST /auth/resend-otp` — **PUBLIC**

> 60-second cooldown between requests.

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `email` | `string` | Yes | Valid email |

**Response (`data`):**

```json
{
  "message": "OTP resent successfully"
}
```

---

### Step 3 — Create Profile

`POST /auth/create-profile` — **AUTH REQUIRED**

> **Content-Type:** `multipart/form-data`

**Form Fields:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `firstName` | `text` | Yes | 1–50 characters |
| `lastName` | `text` | Yes | 1–50 characters |
| `phoneNumber` | `text` | No | Max 20 characters |
| `dateOfBirth` | `text` | No | ISO date string (e.g. `1998-05-15`) |
| `profileImage` | `file` | No | jpg, png, gif, webp — Max 5MB |

**Response (`data`):**

```json
{
  "id": "665f1a2b3c4d5e6f7a8b9c0d",
  "email": "user@example.com",
  "role": "user",
  "isEmailVerified": true,
  "isProfileComplete": true,
  "firstName": "Hamza",
  "lastName": "Khan",
  "phoneNumber": "+923001234567",
  "dateOfBirth": "1998-05-15",
  "profileImage": {
    "id": "665f1a2b3c4d5e6f7a8b9c0e",
    "fileName": "profile-1234567890.jpg",
    "fileType": "image/jpeg",
    "url": "http://localhost:3000/uploads/profiles/profile-1234567890.jpg"
  },
  "subscriptionTier": "free"
}
```

---

## 2. Auth — Login

`POST /auth/login` — **PUBLIC**

> If email is not verified, returns `401` and auto-sends OTP.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "Test@12345"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `email` | `string` | Yes | Valid email |
| `password` | `string` | Yes | Min 6 characters |

**Response (`data`):**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "665f1a2b3c4d5e6f7a8b9c0d",
    "email": "user@example.com",
    "role": "user",
    "isEmailVerified": true,
    "isProfileComplete": true,
    "firstName": "Hamza",
    "lastName": "Khan",
    "phoneNumber": "+923001234567",
    "dateOfBirth": "1998-05-15",
    "profileImage": {
      "id": "665f1a2b3c4d5e6f7a8b9c0e",
      "fileName": "profile-1234567890.jpg",
      "fileType": "image/jpeg",
      "url": "http://localhost:3000/uploads/profiles/profile-1234567890.jpg"
    },
    "subscriptionTier": "free"
  }
}
```

---

## 3. Auth — Social Login (Firebase)

> Single endpoint handles both signup and login. Frontend authenticates with Firebase, backend verifies.

### Frontend Flow (Firebase Client-Side)

```
1. User taps "Sign in with Google" / "Sign in with Apple" / "Sign in with GitHub"
2. Firebase SDK handles OAuth flow → returns Firebase idToken
3. Frontend sends idToken + provider to POST /auth/social
4. Backend verifies token with Firebase Admin SDK
5. Backend returns accessToken + refreshToken + user profile + isNewUser flag
6. If isNewUser === true → navigate to "Complete Profile" screen
7. If isNewUser === false && user.isProfileComplete === false → navigate to "Complete Profile"
8. Otherwise → navigate to Home
```

### Social Login / Register

`POST /auth/social` — **PUBLIC**

**Request Body:**

```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIs...",
  "provider": "google"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `idToken` | `string` | Yes | Firebase ID token from client-side auth |
| `provider` | `string` | Yes | One of: `google`, `apple`, `github` |

**Response (`data`):**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "user": {
    "id": "665f1a2b3c4d5e6f7a8b9c0d",
    "email": "user@gmail.com",
    "role": "user",
    "isEmailVerified": true,
    "isProfileComplete": false,
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": null,
    "dateOfBirth": null,
    "profileImage": null,
    "subscriptionTier": "free",
    "socialProvider": "google",
    "socialPhotoUrl": "https://lh3.googleusercontent.com/a/photo..."
  },
  "isNewUser": true
}
```

### Use Cases

| Scenario | What Happens |
|----------|-------------|
| **New user** (email never seen before) | Creates account, `isEmailVerified: true`, `isNewUser: true`. Frontend should navigate to "Create Profile" screen. |
| **Existing email/password user** | Links social provider to account, `isNewUser: false`. All existing data preserved. |
| **Existing social user** (returning) | Logs in, `isNewUser: false`. Returns current profile as-is. |
| **Social account without email** | Returns `400` with `SOCIAL_EMAIL_MISSING` error code. |
| **Invalid/expired Firebase token** | Returns `401` with `SOCIAL_TOKEN_INVALID` error code. |

### Error Responses

| Status | Code | Message |
|--------|------|---------|
| `401` | `SOCIAL_TOKEN_INVALID` | Invalid or expired social auth token |
| `400` | `SOCIAL_EMAIL_MISSING` | Social account does not have an email address |

### After Social Auth — Complete Profile

If `isNewUser === true` or `user.isProfileComplete === false`, call:

`POST /auth/create-profile` — with the `accessToken` from social auth response.

> Social users skip email verification entirely — their email is already verified by Google/Apple/GitHub.

### Session Management

Social auth users share the same session infrastructure as email/password users:

- **Access token** — JWT, same expiry as regular auth (configured via `JWT_EXPIRY`)
- **Refresh token** — UUID, stored in DB, 30-day expiry
- **Logout** — `POST /auth/logout` with `refreshToken` in body revokes the current session
- **Refresh** — `POST /auth/refresh` works identically

---

## 4. Auth — Forgot Password

### Step 1 — Forgot Password

`POST /auth/forgot-password` — **PUBLIC**

> Always returns success (does not leak whether email exists).

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `email` | `string` | Yes | Valid email |

**Response (`data`):**

```json
{
  "message": "If this email exists, an OTP has been sent"
}
```

---

### Step 2 — Reset Password

`POST /auth/reset-password` — **PUBLIC**

> Invalidates all existing refresh tokens after reset.

**Request Body:**

```json
{
  "email": "user@example.com",
  "code": "123456",
  "newPassword": "NewPass@123"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `email` | `string` | Yes | Valid email |
| `code` | `string` | Yes | Exactly 6 digits |
| `newPassword` | `string` | Yes | Min 8 chars, 1 uppercase, 1 number, 1 special char |

**Response (`data`):**

```json
{
  "message": "Password reset successfully"
}
```

---

## 5. Auth — Token & Session

### Refresh Tokens

`POST /auth/refresh` — **PUBLIC**

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `refreshToken` | `string` | Yes | Valid refresh token string |

**Response (`data`):**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "665f1a2b3c4d5e6f7a8b9c0d",
    "email": "user@example.com",
    "role": "user",
    "isEmailVerified": true,
    "isProfileComplete": true,
    "firstName": "Hamza",
    "lastName": "Khan",
    "phoneNumber": "+923001234567",
    "dateOfBirth": "1998-05-15",
    "profileImage": null,
    "subscriptionTier": "free"
  }
}
```

---

### Logout

`POST /auth/logout` — **AUTH REQUIRED**

Revokes the current session by invalidating the given refresh token.
If the refresh token does not match any active session, **all sessions** for
the user are revoked as a safety fallback (logout everywhere).

**Request Body:**

```json
{
  "refreshToken": "c5f8a2e1-..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `refreshToken` | `string` | **Yes** | The refresh token that was issued during login / social login / refresh |

**Response (`data`):**

```json
{
  "message": "Logged out successfully"
}
```

---

## 6. User Profile

### Get My Profile

`GET /users/me` — **AUTH REQUIRED**

**Request Body:** *None*

**Response (`data`):**

```json
{
  "id": "665f1a2b3c4d5e6f7a8b9c0d",
  "email": "user@example.com",
  "role": "user",
  "isEmailVerified": true,
  "isProfileComplete": true,
  "firstName": "Hamza",
  "lastName": "Khan",
  "phoneNumber": "+923001234567",
  "dateOfBirth": "1998-05-15",
  "profileImage": {
    "id": "665f1a2b3c4d5e6f7a8b9c0e",
    "fileName": "profile-1234567890.jpg",
    "fileType": "image/jpeg",
    "url": "http://localhost:3000/uploads/profiles/profile-1234567890.jpg"
  },
  "subscriptionTier": "free"
}
```

---

### Update My Profile (with Image)

`PATCH /users/me` — **AUTH REQUIRED**

> **Content-Type:** `multipart/form-data`
> Old profile image is auto-deleted from storage when replaced.

**Form Fields:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `firstName` | `text` | No | 1–50 characters |
| `lastName` | `text` | No | 1–50 characters |
| `phoneNumber` | `text` | No | Max 20 characters |
| `dateOfBirth` | `text` | No | ISO date string |
| `profileImage` | `file` | No | jpg, png, gif, webp — Max 5MB |

**Response (`data`):** Same `UserProfileDto` shape as Get My Profile.

---

### Update My Profile (JSON Only)

`PATCH /users/me` — **AUTH REQUIRED**

> **Content-Type:** `application/json`
> Use when only updating text fields (no image).

**Request Body:**

```json
{
  "firstName": "Hamza",
  "lastName": "Updated",
  "phoneNumber": "+923009876543"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `firstName` | `string` | No | 1–50 characters |
| `lastName` | `string` | No | 1–50 characters |
| `phoneNumber` | `string` | No | Max 20 characters |
| `dateOfBirth` | `string` | No | ISO date string |

**Response (`data`):** Same `UserProfileDto` shape as Get My Profile.

---

### Delete Profile Image

`DELETE /users/me/profile-image` — **AUTH REQUIRED**

**Request Body:** *None*

**Response (`data`):** Same `UserProfileDto` shape — `profileImage` will be `null`.

---

## 7. Settings — Notifications, Password, Delete Account

> All endpoints require authentication.

### Get Notification Settings

`GET /settings/notifications` — **AUTH REQUIRED**

**Request Body:** *None*

**Response (`data`):**

```json
{
  "enabled": true
}
```

---

### Update Notification Settings

`PATCH /settings/notifications` — **AUTH REQUIRED**

**Request Body:**

```json
{
  "enabled": false
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `enabled` | `boolean` | Yes | `true` or `false` |

**Response (`data`):**

```json
{
  "enabled": false
}
```

---

### Change Password

`POST /settings/change-password` — **AUTH REQUIRED**

> Social-only users (no password) will receive a `400` error.

**Request Body:**

```json
{
  "currentPassword": "OldPass@123",
  "newPassword": "NewPass@456",
  "confirmPassword": "NewPass@456"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `currentPassword` | `string` | Yes | Current password |
| `newPassword` | `string` | Yes | Min 8 chars, 1 uppercase, 1 number, 1 special char |
| `confirmPassword` | `string` | Yes | Must match `newPassword` |

**Response (`data`):**

```json
{
  "message": "Password changed successfully"
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| `400` | `INVALID_CREDENTIALS` | Current password is wrong |
| `400` | `PASSWORD_CHANGE_NO_PASSWORD` | Social-only user (no password to change) |

---

### Delete Account

`DELETE /users/me/account` — **AUTH REQUIRED**

> Soft-deletes the account and revokes all sessions. The account is deactivated, not permanently removed.

**Request Body:** *None*

**Response (`data`):**

```json
{
  "message": "Account deleted successfully"
}
```

---

## 8. Content — Terms, Privacy, Help (Public)

> Static content pages managed by admin, read publicly by the frontend.

### Get Content by Slug

`GET /content/:slug` — **PUBLIC**

**Available Slugs:** `terms-and-conditions`, `privacy-policy`, `help-instructions`

**Path Parameters:**

| Param | Type | Validation |
|-------|------|------------|
| `slug` | `string` | One of the available slugs |

**Response (`data`):**

```json
{
  "id": "665f1a2b3c4d5e6f7a8b9c20",
  "slug": "terms-and-conditions",
  "title": "Terms & Conditions",
  "body": "<p>Full terms and conditions content here...</p>",
  "socialLinks": [],
  "isPublished": true,
  "updatedAt": "2026-04-06T12:00:00.000Z"
}
```

**Help & Feedback page** (`help-instructions`) includes `socialLinks` for Instagram/Facebook:

```json
{
  "id": "665f1a2b3c4d5e6f7a8b9c22",
  "slug": "help-instructions",
  "title": "Help & Feedback",
  "body": "<h2>Instructions</h2><p>How to use the app...</p>",
  "socialLinks": [
    "https://instagram.com/pokerank",
    "https://facebook.com/pokerank"
  ],
  "isPublished": true,
  "updatedAt": "2026-04-06T12:00:00.000Z"
}
```

---

## 9. Support Tickets (Auth)

### Submit a Ticket

`POST /tickets` — **AUTH REQUIRED**

> **Content-Type:** `multipart/form-data`

**Form Fields:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `title` | `text` | Yes | 3–200 characters |
| `description` | `text` | Yes | 10–2000 characters |
| `media` | `file` | No | Image file (jpg, png, gif, webp) — Max 5MB |

**Response (`data`):**

```json
{
  "id": "665f1a2b3c4d5e6f7a8b9c30",
  "title": "App crashes on Pokédex screen",
  "description": "When I open Pokédex and scroll, the app freezes...",
  "status": "open",
  "attachments": [
    {
      "id": "665f1a2b3c4d5e6f7a8b9c31",
      "fileName": "screenshot.png",
      "fileType": "image/png",
      "url": "http://localhost:3000/uploads/tickets/abc123.png"
    }
  ],
  "replies": [],
  "createdAt": "2026-04-06T12:00:00.000Z",
  "updatedAt": "2026-04-06T12:00:00.000Z"
}
```

---

### List My Tickets

`GET /tickets` — **AUTH REQUIRED**

**Query Parameters:**

| Param | Type | Required | Validation |
|-------|------|----------|------------|
| `status` | `string` | No | `open`, `in_progress`, `resolved`, `closed` |

**Response (`data`):**

```json
[
  {
    "id": "665f1a2b3c4d5e6f7a8b9c30",
    "title": "App crashes on Pokédex screen",
    "description": "When I open Pokédex and scroll...",
    "status": "in_progress",
    "attachments": [],
    "replies": [
      {
        "message": "We are looking into this issue.",
        "isAdmin": true,
        "createdAt": "2026-04-06T14:00:00.000Z"
      }
    ],
    "createdAt": "2026-04-06T12:00:00.000Z",
    "updatedAt": "2026-04-06T14:00:00.000Z"
  }
]
```

---

### Get Ticket Detail

`GET /tickets/:id` — **AUTH REQUIRED**

**Path Parameters:**

| Param | Type | Validation |
|-------|------|------------|
| `id` | `string` | MongoDB ObjectId |

**Response (`data`):** Same shape as list items above.

---

## 10. Pokédex (Public)

### List Pokémon

`GET /pokedex` — **PUBLIC**

**Query Parameters:**

| Param | Type | Required | Validation | Default |
|-------|------|----------|------------|---------|
| `page` | `number` | No | Integer, min 1 | `1` |
| `limit` | `number` | No | Integer, min 1, max 100 | `20` |
| `type` | `string` | No | One of: `Normal`, `Fire`, `Water`, `Electric`, `Grass`, `Ice`, `Fighting`, `Poison`, `Ground`, `Flying`, `Psychic`, `Bug`, `Rock`, `Ghost`, `Dragon`, `Dark`, `Steel`, `Fairy` | — |
| `region` | `string` | No | e.g. `kanto`, `johto`, `hoenn` | — |
| `generation` | `number` | No | Integer, 1–9 | — |
| `league` | `string` | No | `great`, `ultra`, `master` | — |

**Response (`data` + `meta`):**

```json
{
  "data": [
    {
      "pokemonId": 6,
      "name": "Charizard",
      "types": ["Fire", "Flying"],
      "baseAtk": 223,
      "baseDef": 173,
      "baseSta": 186,
      "spriteUrl": "https://raw.githubusercontent.com/.../6.png"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 386,
    "totalPages": 20
  }
}
```

---

### Trending Pokémon

`GET /pokedex/trending` — **PUBLIC**

**Query Parameters:**

| Param | Type | Required | Default |
|-------|------|----------|---------|
| `limit` | `number` | No | `10` |

**Response (`data`):**

```json
[
  {
    "pokemonId": 150,
    "name": "Mewtwo",
    "types": ["Psychic"],
    "baseAtk": 300,
    "baseDef": 182,
    "baseSta": 214,
    "spriteUrl": "https://raw.githubusercontent.com/.../150.png",
    "overallRanking": 1,
    "league": "master"
  }
]
```

---

### Search Pokémon

`GET /pokedex/search` — **PUBLIC**

**Query Parameters:**

| Param | Type | Required | Validation |
|-------|------|----------|------------|
| `q` | `string` | Yes | Case-insensitive, max 20 results |

**Response (`data`):**

```json
[
  {
    "pokemonId": 6,
    "name": "Charizard",
    "types": ["Fire", "Flying"],
    "baseAtk": 223,
    "baseDef": 173,
    "baseSta": 186,
    "spriteUrl": "https://raw.githubusercontent.com/.../6.png"
  }
]
```

---

### Get Pokémon Detail

`GET /pokedex/:id` — **PUBLIC**

**Path Parameters:**

| Param | Type | Validation |
|-------|------|------------|
| `id` | `number` | Positive integer (Pokédex number) |

**Response (`data`):**

```json
{
  "pokemonId": 6,
  "name": "Charizard",
  "types": ["Fire", "Flying"],
  "baseAtk": 223,
  "baseDef": 173,
  "baseSta": 186,
  "totalStats": 582,
  "maxCp": 2889,
  "statProduct": 7562934,
  "generation": 1,
  "region": "kanto",
  "spriteUrl": "https://raw.githubusercontent.com/.../6.png",
  "flavorText": "Spits fire that is hot enough to melt boulders...",

  "fastMoves": [
    {
      "moveId": 1,
      "name": "Fire Spin",
      "type": "Fire",
      "power": 14,
      "energy": 10,
      "dps": 12.73,
      "isElite": false
    }
  ],

  "chargeMoves": [
    {
      "moveId": 2,
      "name": "Blast Burn",
      "type": "Fire",
      "power": 110,
      "energy": -50,
      "dps": 33.33,
      "isElite": true
    }
  ],

  "typeEffectiveness": {
    "weakTo": ["Rock", "Water", "Electric"],
    "resistantTo": ["Fire", "Grass", "Bug", "Steel", "Fighting", "Fairy"],
    "immuneTo": ["Ground"]
  },

  "evolutionChain": [
    {
      "pokemonId": 4,
      "name": "Charmander",
      "spriteUrl": "https://raw.githubusercontent.com/.../4.png",
      "generation": 1,
      "baseStatsTotal": 309,
      "candyCost": 25,
      "conditions": null,
      "stageLabel": "1/3",
      "rankings": [
        { "league": "great", "rank": 245, "dps": 8.5, "rating": "D" }
      ]
    },
    {
      "pokemonId": 5,
      "name": "Charmeleon",
      "spriteUrl": "https://raw.githubusercontent.com/.../5.png",
      "generation": 1,
      "baseStatsTotal": 405,
      "candyCost": 100,
      "conditions": null,
      "stageLabel": "2/3",
      "rankings": [
        { "league": "great", "rank": 180, "dps": 10.2, "rating": "C" }
      ]
    },
    {
      "pokemonId": 6,
      "name": "Charizard",
      "spriteUrl": "https://raw.githubusercontent.com/.../6.png",
      "generation": 1,
      "baseStatsTotal": 582,
      "candyCost": null,
      "conditions": null,
      "stageLabel": "3/3",
      "rankings": [
        { "league": "great", "rank": 42, "dps": 14.1, "rating": "A" }
      ]
    }
  ],

  "rankings": [
    { "league": "great", "rank": 42, "dps": 14.1, "rating": "A" },
    { "league": "ultra", "rank": 35, "dps": 15.8, "rating": "A" },
    { "league": "master", "rank": 78, "dps": 16.2, "rating": "B" }
  ],

  "bestUseCases": [
    { "category": "PvP", "rating": 4 },
    { "category": "Raid", "rating": 4 }
  ],

  "prevId": 5,
  "nextId": 7
}
```

---

### Get Pokémon Neighbors

`GET /pokedex/:id/neighbors` — **PUBLIC**

**Path Parameters:**

| Param | Type | Validation |
|-------|------|------------|
| `id` | `number` | Positive integer |

**Response (`data`):**

```json
{
  "prev": {
    "pokemonId": 5,
    "name": "Charmeleon",
    "types": ["Fire"],
    "baseAtk": 158,
    "baseDef": 126,
    "baseSta": 151,
    "spriteUrl": "https://raw.githubusercontent.com/.../5.png"
  },
  "next": {
    "pokemonId": 7,
    "name": "Squirtle",
    "types": ["Water"],
    "baseAtk": 94,
    "baseDef": 121,
    "baseSta": 127,
    "spriteUrl": "https://raw.githubusercontent.com/.../7.png"
  }
}
```

> `prev` or `next` can be `null` for first/last Pokémon.

---

## 11. Rankings (Public)

### Get Rankings List

`GET /rankings` — **PUBLIC**

**Query Parameters:**

| Param | Type | Required | Validation | Default |
|-------|------|----------|------------|---------|
| `league` | `string` | **Yes** | `great`, `ultra`, `master` | — |
| `mode` | `string` | **Yes** | `pvp`, `pve` | — |
| `page` | `number` | No | Integer, min 1 | `1` |
| `limit` | `number` | No | Integer, min 1, max 100 | `20` |
| `sort` | `string` | No | `metaRelevance`, `dps`, `tdo`, `movesetEfficiency` | — |
| `role` | `string` | No | `attacker`, `tank`, `support` | — |

**Response (`data` + `meta`):**

```json
{
  "data": [
    {
      "pokemonId": 150,
      "pokemonName": "Mewtwo",
      "pokemonTypes": ["Psychic"],
      "spriteUrl": "https://raw.githubusercontent.com/.../150.png",
      "league": "great",
      "mode": "pvp",
      "rank": 1,
      "dps": 18.5,
      "tdo": 450.2,
      "statProduct": 9876543,
      "movesetEfficiency": 95.4,
      "role": "attacker",
      "bestMoveset": "Confusion / Psystrike",
      "bestSpread": "15/15/15"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 386,
    "totalPages": 20
  }
}
```

---

### Get Ranking Detail

`GET /rankings/:pokemonId` — **PUBLIC**

**Path Parameters:**

| Param | Type | Validation |
|-------|------|------------|
| `pokemonId` | `number` | Positive integer |

**Query Parameters:**

| Param | Type | Required | Default |
|-------|------|----------|---------|
| `league` | `string` | No | `great` |
| `mode` | `string` | No | `pvp` |

**Response (`data`):**

```json
{
  "pokemonId": 6,
  "pokemonName": "Charizard",
  "pokemonTypes": ["Fire", "Flying"],
  "spriteUrl": "https://raw.githubusercontent.com/.../6.png",
  "league": "great",
  "mode": "pvp",
  "rank": 42,
  "dps": 14.1,
  "tdo": 320.5,
  "statProduct": 7562934,
  "movesetEfficiency": 88.2,
  "role": "attacker",
  "bestMoveset": "Fire Spin / Blast Burn",
  "bestSpread": "0/14/11",

  "overallRank": 42,
  "typeRank": 3,

  "damagePerSecond": 14.1,
  "totalDamageOutput": 320.5,
  "bestIvSpread": "0/14/11",

  "rankingTrends": [
    { "label": "Current", "rank": 42, "delta": 0 },
    { "label": "3 months ago", "rank": 45, "delta": 3 },
    { "label": "6 months ago", "rank": 50, "delta": 8 },
    { "label": "9 months ago", "rank": 48, "delta": 6 },
    { "label": "1 year ago", "rank": 55, "delta": 13 }
  ],

  "topCounters": [
    {
      "pokemonId": 248,
      "name": "Tyranitar",
      "spriteUrl": "https://raw.githubusercontent.com/.../248.png"
    },
    {
      "pokemonId": 409,
      "name": "Rampardos",
      "spriteUrl": "https://raw.githubusercontent.com/.../409.png"
    },
    {
      "pokemonId": 130,
      "name": "Gyarados",
      "spriteUrl": "https://raw.githubusercontent.com/.../130.png"
    }
  ],

  "movesetEffectiveness": [
    { "moveset": "Fire Spin + Blast Burn", "effectiveness": 96 },
    { "moveset": "Dragon Breath + Dragon Claw", "effectiveness": 89 },
    { "moveset": "Fire Spin + Overheat", "effectiveness": 82 }
  ]
}
```

---

## 12. Raids & Counter (Public + Auth)

### List Active Raid Bosses

`GET /raids` — **PUBLIC**

**Request Body:** *None*

**Response (`data`):**

```json
[
  {
    "id": "665f1a2b3c4d5e6f7a8b9c0d",
    "pokemonId": 150,
    "pokemonName": "Mewtwo",
    "pokemonTypes": ["Psychic"],
    "tier": 5,
    "starRating": 5,
    "isActive": true,
    "cp": 54148,
    "spriteUrl": "https://raw.githubusercontent.com/.../150.png",
    "weaknesses": ["Bug", "Dark", "Ghost"],
    "dps": 18.5,
    "tdo": 750.2,
    "ivSpread": "15/15/15",
    "league": "master",
    "evolutions": "No Evolutions"
  }
]
```

---

### Get Raid Boss Detail

`GET /raids/:bossId` — **PUBLIC**

**Path Parameters:**

| Param | Type | Validation |
|-------|------|------------|
| `bossId` | `string` | MongoDB ObjectId |

**Response (`data`):**

```json
{
  "id": "665f1a2b3c4d5e6f7a8b9c0d",
  "pokemonId": 150,
  "pokemonName": "Mewtwo",
  "pokemonTypes": ["Psychic"],
  "tier": 5,
  "starRating": 5,
  "isActive": true,
  "cp": 54148,
  "spriteUrl": "https://raw.githubusercontent.com/.../150.png",

  "quickMoves": ["Confusion", "Psycho Cut"],
  "chargedMoves": ["Psystrike*", "Shadow Ball", "Focus Blast", "Flamethrower"],

  "catchCp": 2387,
  "weatherBoostedCatchCp": 2984,

  "currentRankings": {
    "overallRank": 1,
    "typeRank": 1
  },

  "league": "master",

  "potentialForms": [
    { "name": "Shadow Mewtwo", "overallRank": 1, "typeRank": 1 },
    { "name": "Mega Mewtwo Y", "overallRank": 1, "typeRank": 1 }
  ],

  "allWeaknesses": ["Bug", "Dark", "Ghost"],

  "idealCounters": [
    {
      "pokemonId": 94,
      "name": "Gengar",
      "types": ["Ghost", "Poison"],
      "spriteUrl": "https://raw.githubusercontent.com/.../94.png",
      "quickMove": "Shadow Claw",
      "chargedMove": "Shadow Ball",
      "dps": 21.3,
      "survivePercent": 65,
      "effectivenessPercent": 98
    },
    {
      "pokemonId": 248,
      "name": "Tyranitar",
      "types": ["Rock", "Dark"],
      "spriteUrl": "https://raw.githubusercontent.com/.../248.png",
      "quickMove": "Bite",
      "chargedMove": "Crunch",
      "dps": 17.8,
      "survivePercent": 85,
      "effectivenessPercent": 92
    }
  ],

  "suggestedTeam": [
    {
      "pokemonId": 94,
      "name": "Gengar",
      "spriteUrl": "https://raw.githubusercontent.com/.../94.png"
    },
    {
      "pokemonId": 248,
      "name": "Tyranitar",
      "spriteUrl": "https://raw.githubusercontent.com/.../248.png"
    },
    {
      "pokemonId": 131,
      "name": "Lapras",
      "spriteUrl": "https://raw.githubusercontent.com/.../131.png"
    }
  ]
}
```

> `*` after a move name indicates elite/legacy move.

---

### Get My Raid Teams

`GET /raids/queues` — **AUTH REQUIRED**

**Request Body:** *None*

**Response (`data`):**

```json
[
  {
    "id": "665f1a2b3c4d5e6f7a8b9c10",
    "raidBossId": "665f1a2b3c4d5e6f7a8b9c0d",
    "pokemonIds": [248, 94, 131],
    "createdAt": "2026-04-06T12:00:00.000Z"
  }
]
```

---

### Save Counter Team

`POST /raids/:bossId/queue` — **AUTH REQUIRED**

**Path Parameters:**

| Param | Type | Validation |
|-------|------|------------|
| `bossId` | `string` | MongoDB ObjectId |

**Request Body:**

```json
{
  "pokemonIds": [248, 94, 131]
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `pokemonIds` | `number[]` | Yes | Array of Pokémon IDs, 1–6 items |

**Response (`data`):**

```json
{
  "id": "665f1a2b3c4d5e6f7a8b9c10",
  "raidBossId": "665f1a2b3c4d5e6f7a8b9c0d",
  "pokemonIds": [248, 94, 131],
  "createdAt": "2026-04-06T12:00:00.000Z"
}
```

---

### Delete Saved Team

`DELETE /raids/queues/:queueId` — **AUTH REQUIRED**

**Path Parameters:**

| Param | Type | Validation |
|-------|------|------------|
| `queueId` | `string` | MongoDB ObjectId |

**Response (`data`):**

```json
{
  "message": "Queue deleted successfully"
}
```

---

## 13. Name Generator (Public + Auth)

### Generate Name

`POST /name-generator/generate` — **PUBLIC**

> Pokémon GO name limit: 12 characters. Result is auto-truncated.

**Available Template Tokens:** `{Species}`, `{IV}`, `{IVSpread}`, `{League}` (GL/UL/ML), `{Role}` (ATK/TNK/SUP), `{Moveset}` (FS/BB), `{Rank}`, `{CP}`

**Request Body:**

```json
{
  "template": "{Species}_{IV}_{League}",
  "pokemonId": 6,
  "ivPercent": 98,
  "league": "great"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `template` | `string` | Yes | Template string with tokens |
| `pokemonId` | `number` | Yes | Integer (Pokédex number) |
| `ivPercent` | `number` | No | Integer 0–100 |
| `ivSpread` | `string` | No | Format: `15/14/15` (ATK/DEF/STA) |
| `league` | `string` | No | `great`, `ultra`, `master` |
| `role` | `string` | No | `attacker`, `tank`, `support` |
| `fastMove` | `string` | No | Move name (e.g. `Fire Spin`) |
| `chargeMove` | `string` | No | Move name (e.g. `Blast Burn`) |
| `rank` | `number` | No | Integer (meta ranking) |
| `cp` | `number` | No | Integer (current CP) |

**Response (`data`):**

```json
{
  "generatedName": "Chari_98_GL",
  "pokemonName": "Charizard"
}
```

---

### Get My Presets

`GET /name-generator/presets` — **AUTH REQUIRED**

**Request Body:** *None*

**Response (`data`):**

```json
[
  {
    "id": "665f1a2b3c4d5e6f7a8b9c11",
    "name": "PvP Standard",
    "template": "{Species}_{IV}_{League}"
  }
]
```

---

### Save Preset

`POST /name-generator/presets` — **AUTH REQUIRED**

**Request Body:**

```json
{
  "name": "PvP Standard",
  "template": "{Species}_{IV}_{League}"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | `string` | Yes | Max 50 characters |
| `template` | `string` | Yes | Max 100 characters |

**Response (`data`):**

```json
{
  "id": "665f1a2b3c4d5e6f7a8b9c11",
  "name": "PvP Standard",
  "template": "{Species}_{IV}_{League}"
}
```

---

### Delete Preset

`DELETE /name-generator/presets/:id` — **AUTH REQUIRED**

**Path Parameters:**

| Param | Type | Validation |
|-------|------|------------|
| `id` | `string` | MongoDB ObjectId |

**Response (`data`):**

```json
{
  "message": "Preset deleted successfully"
}
```

---

## 14. Ranking History (Auth)

> All endpoints in this section require authentication.

### Get Battle History Stats

`GET /history/stats` — **AUTH REQUIRED**

**Request Body:** *None*

**Response (`data`):**

```json
{
  "teamsCount": 12,
  "pokemonCount": 45,
  "avgTeamSize": 3.8
}
```

---

### Get Ranking History List

`GET /history` — **AUTH REQUIRED**

**Query Parameters:**

| Param | Type | Required | Validation | Default |
|-------|------|----------|------------|---------|
| `page` | `number` | No | Integer, min 1 | `1` |
| `limit` | `number` | No | Integer, min 1, max 100 | `20` |
| `tier` | `string` | No | `S`, `A`, `B`, `C`, `D` | — |
| `league` | `string` | No | `great`, `ultra`, `master` | — |

**Response (`data` + `meta`):**

```json
{
  "data": [
    {
      "id": "665f1a2b3c4d5e6f7a8b9c12",
      "pokemonId": 150,
      "pokemonName": "Mewtwo",
      "pokemonTypes": ["Psychic"],
      "spriteUrl": "https://raw.githubusercontent.com/.../150.png",
      "league": "master",
      "metaRank": 1,
      "tier": "S",
      "ivPercent": 100,
      "ivSpread": "15/15/15",
      "cp": 4178,
      "dps": 18.5,
      "tdo": 750.2,
      "analyzedAt": "2026-04-01T10:30:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

### Get History Entry Detail

`GET /history/:entryId/detail` — **AUTH REQUIRED**

**Path Parameters:**

| Param | Type | Validation |
|-------|------|------------|
| `entryId` | `string` | MongoDB ObjectId |

**Response (`data`):**

```json
{
  "id": "665f1a2b3c4d5e6f7a8b9c12",
  "pokemonId": 150,
  "pokemonName": "Mewtwo",
  "pokemonTypes": ["Psychic"],
  "spriteUrl": "https://raw.githubusercontent.com/.../150.png",
  "league": "master",
  "metaRank": 1,
  "tier": "S",
  "ivPercent": 100,
  "ivSpread": "15/15/15",
  "cp": 4178,
  "dps": 18.5,
  "tdo": 750.2,
  "analyzedAt": "2026-04-01T10:30:00.000Z",

  "ivBreakdown": {
    "attack": 15,
    "defense": 15,
    "hp": 15
  },

  "rankTrend": [
    { "date": "2026-01-01", "rank": 3 },
    { "date": "2026-02-01", "rank": 2 },
    { "date": "2026-03-01", "rank": 1 },
    { "date": "2026-04-01", "rank": 1 }
  ],

  "notes": [
    "Strong in current meta",
    "Move set Rebalance Impact: +2 ranks",
    "Top pick for Master League"
  ]
}
```

---

### Get Pokémon Rank Trend

`GET /history/:pokemonId/trend` — **AUTH REQUIRED**

**Path Parameters:**

| Param | Type | Validation |
|-------|------|------------|
| `pokemonId` | `number` | Positive integer |

**Response (`data`):**

```json
[
  { "date": "2026-01-01", "rank": 5 },
  { "date": "2026-02-01", "rank": 3 },
  { "date": "2026-03-01", "rank": 2 },
  { "date": "2026-04-01", "rank": 1 }
]
```

---

### Get Saved Teams

`GET /history/teams` — **AUTH REQUIRED**

**Request Body:** *None*

**Response (`data`):**

```json
[
  {
    "id": "665f1a2b3c4d5e6f7a8b9c13",
    "bossName": "Mewtwo",
    "bossId": "665f1a2b3c4d5e6f7a8b9c0d",
    "pokemonCount": 3,
    "members": [
      {
        "pokemonId": 94,
        "name": "Gengar",
        "types": ["Ghost", "Poison"],
        "spriteUrl": "https://raw.githubusercontent.com/.../94.png"
      },
      {
        "pokemonId": 248,
        "name": "Tyranitar",
        "types": ["Rock", "Dark"],
        "spriteUrl": "https://raw.githubusercontent.com/.../248.png"
      },
      {
        "pokemonId": 131,
        "name": "Lapras",
        "types": ["Water", "Ice"],
        "spriteUrl": "https://raw.githubusercontent.com/.../131.png"
      }
    ],
    "createdAt": "2026-04-06T12:00:00.000Z"
  }
]
```

---

### Export History (JSON)

`GET /history/export` — **AUTH REQUIRED**

**Request Body:** *None*

**Response (`data`):** Array of `HistoryEntryDto` — same shape as the list endpoint items.

---

### Delete History Entry

`DELETE /history/:entryId` — **AUTH REQUIRED**

**Path Parameters:**

| Param | Type | Validation |
|-------|------|------------|
| `entryId` | `string` | MongoDB ObjectId |

**Response (`data`):**

```json
{
  "message": "History entry deleted successfully"
}
```

---

## 15. Recommendations (Auth)

### Generate Recommendations

`POST /recommendations` — **AUTH REQUIRED**

**Request Body:**

```json
{
  "stardust": 75000,
  "ownedPokemon": [
    {
      "pokemonId": 6,
      "ivAtk": 15,
      "ivDef": 14,
      "ivSta": 15,
      "currentLevel": 20,
      "combatPower": 1500,
      "candyCount": 124
    },
    {
      "pokemonId": 150,
      "ivAtk": 15,
      "ivDef": 15,
      "ivSta": 15,
      "currentLevel": 35,
      "combatPower": 3800,
      "candyCount": 60
    }
  ]
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `stardust` | `number` | Yes | Integer, min 0 |
| `ownedPokemon` | `array` | Yes | Array of owned Pokémon objects |
| `ownedPokemon[].pokemonId` | `number` | Yes | Integer (Pokédex number) |
| `ownedPokemon[].ivAtk` | `number` | Yes | Integer, min 0 |
| `ownedPokemon[].ivDef` | `number` | Yes | Integer, min 0 |
| `ownedPokemon[].ivSta` | `number` | Yes | Integer, min 0 |
| `ownedPokemon[].currentLevel` | `number` | Yes | Number, min 1 |
| `ownedPokemon[].combatPower` | `number` | No | Integer, min 0 — current CP |
| `ownedPokemon[].candyCount` | `number` | No | Integer, min 0 — available candy for this species |

**Response (`data`):**

```json
[
  {
    "pokemonId": 6,
    "pokemonName": "Charizard",
    "spriteUrl": "https://raw.githubusercontent.com/.../6.png",
    "action": "POWER_UP",
    "reasoning": "High IV (98%) at level 20. You have enough resources — powering up would significantly increase CP and battle effectiveness.",
    "estimatedCp": 2489,
    "league": "ultra",
    "metaRank": 35,
    "ivPercent": 98,
    "cost": {
      "stardust": 75000,
      "candy": 66,
      "candyLabel": "Charizard (66)"
    }
  },
  {
    "pokemonId": 150,
    "pokemonName": "Mewtwo",
    "spriteUrl": "https://raw.githubusercontent.com/.../150.png",
    "action": "EVOLVE",
    "reasoning": "Strong IVs (100%) make this a good evolution candidate for competitive use.",
    "estimatedCp": 4178,
    "league": "master",
    "metaRank": 1,
    "ivPercent": 100,
    "cost": {
      "stardust": 0,
      "candy": 50,
      "candyLabel": "Mewtwo (50)"
    }
  }
]
```

| Response Field | Type | Description |
|---------------|------|-------------|
| `action` | `string` | `EVOLVE` (high IV, can evolve) or `POWER_UP` (high IV, low level) |
| `ivPercent` | `number` | Calculated IV percentage (0–100) |
| `cost.stardust` | `number` | Estimated stardust needed |
| `cost.candy` | `number` | Estimated candy needed |
| `cost.candyLabel` | `string` | Display label, e.g. `"Charizard (66)"` |

---

## 16. Events (Public)

### List Events

`GET /events` — **PUBLIC**

**Query Parameters:**

| Param | Type | Required | Validation | Default |
|-------|------|----------|------------|---------|
| `status` | `string` | No | `active`, `upcoming`, `all` | `all` |
| `page` | `number` | No | Integer, min 1 | `1` |
| `limit` | `number` | No | Integer, min 1, max 100 | `20` |

**Response (`data` + `meta`):**

```json
{
  "data": [
    {
      "id": "665f1a2b3c4d5e6f7a8b9c14",
      "internalId": "community-day-apr-2026",
      "name": "Community Day — April 2026",
      "description": "Featured Pokémon with exclusive moves",
      "bannerImageUrl": "https://example.com/banner.jpg",
      "bonuses": [
        { "label": "3x Catch XP", "icon": "xp" }
      ],
      "featuredPokemonIds": [1, 4, 7],
      "startDate": "2026-04-15T11:00:00.000Z",
      "endDate": "2026-04-15T17:00:00.000Z",
      "timezone": "America/New_York",
      "visibility": "live",
      "priority": 1
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

---

### Get Event Detail

`GET /events/:id` — **PUBLIC**

**Path Parameters:**

| Param | Type | Validation |
|-------|------|------------|
| `id` | `string` | MongoDB ObjectId |

**Response (`data`):** Same `EventResponseDto` shape as list items.

---

## 17. Admin — Events (Admin Only)

> All endpoints require `Authorization: Bearer <accessToken>` with `role: "admin"`.

### List All Events (Admin)

`GET /admin/events` — **ADMIN**

**Query Parameters:**

| Param | Type | Required | Default |
|-------|------|----------|---------|
| `page` | `number` | No | `1` |
| `limit` | `number` | No | `20` |

**Response:** Same paginated `EventResponseDto` shape as public list.

---

### Create Event

`POST /admin/events` — **ADMIN**

**Request Body:**

```json
{
  "internalId": "community-day-apr-2026",
  "name": "Community Day — April 2026",
  "description": "Featured Pokémon with exclusive moves",
  "bannerImageUrl": "https://example.com/banner.jpg",
  "bonuses": [
    { "label": "3x Catch XP", "icon": "xp" }
  ],
  "featuredPokemonIds": [1, 4, 7],
  "startDate": "2026-04-15T11:00:00.000Z",
  "endDate": "2026-04-15T17:00:00.000Z",
  "timezone": "America/New_York",
  "visibility": "scheduled",
  "priority": 1
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `internalId` | `string` | Yes | Unique string identifier |
| `name` | `string` | Yes | Event display name |
| `description` | `string` | No | Event description |
| `bannerImageUrl` | `string` | No | Banner image URL |
| `bonuses` | `array` | No | Array of `{ label: string, icon?: string }` |
| `featuredPokemonIds` | `number[]` | No | Array of Pokédex numbers |
| `startDate` | `string` | Yes | ISO date string |
| `endDate` | `string` | Yes | ISO date string |
| `timezone` | `string` | No | Timezone identifier |
| `visibility` | `string` | No | `live`, `scheduled`, `hidden` |
| `priority` | `number` | No | Integer sort priority |

**Response (`data`):** `EventResponseDto`.

---

### Update Event

`PATCH /admin/events/:id` — **ADMIN**

**Path Parameters:**

| Param | Type | Validation |
|-------|------|------------|
| `id` | `string` | MongoDB ObjectId |

**Request Body:** Partial — any fields from Create Event (all optional).

```json
{
  "name": "Community Day — Updated",
  "priority": 2
}
```

**Response (`data`):** `EventResponseDto`.

---

### Publish Event

`PATCH /admin/events/:id/publish` — **ADMIN**

**Request Body:** *None*

**Response (`data`):** `EventResponseDto` (visibility set to `live`).

---

### Schedule Event

`PATCH /admin/events/:id/schedule` — **ADMIN**

**Request Body:** *None*

**Response (`data`):** `EventResponseDto` (visibility set to `scheduled`).

---

### Delete Event

`DELETE /admin/events/:id` — **ADMIN**

**Request Body:** *None*

**Response (`data`):**

```json
{
  "message": "Event deleted successfully"
}
```

---

### Get Event Audit Log

`GET /admin/events/:id/audit` — **ADMIN**

**Response (`data`):**

```json
[
  {
    "adminUserId": "665f1a2b3c4d5e6f7a8b9c0d",
    "action": "CREATED",
    "before": null,
    "after": { "name": "Community Day — April 2026", "visibility": "scheduled" },
    "timestamp": "2026-04-06T12:00:00.000Z"
  },
  {
    "adminUserId": "665f1a2b3c4d5e6f7a8b9c0d",
    "action": "UPDATED",
    "before": { "priority": 1 },
    "after": { "priority": 2 },
    "timestamp": "2026-04-06T13:00:00.000Z"
  }
]
```

---

## 18. Admin — Content (Admin Only)

> All endpoints require `Authorization: Bearer <accessToken>` with `role: "admin"`.

### List All Content (Admin)

`GET /admin/content` — **ADMIN**

**Response (`data`):**

```json
[
  {
    "id": "665f1a2b3c4d5e6f7a8b9c20",
    "slug": "terms-and-conditions",
    "title": "Terms & Conditions",
    "body": "<p>...</p>",
    "socialLinks": [],
    "isPublished": true,
    "updatedAt": "2026-04-06T12:00:00.000Z"
  }
]
```

---

### Create Content Page

`POST /admin/content` — **ADMIN**

**Request Body:**

```json
{
  "slug": "terms-and-conditions",
  "title": "Terms & Conditions",
  "body": "<p>Full content here...</p>",
  "socialLinks": [],
  "isPublished": true
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `slug` | `string` | Yes | `terms-and-conditions`, `privacy-policy`, `help-instructions` |
| `title` | `string` | Yes | Display title |
| `body` | `string` | Yes | HTML content |
| `socialLinks` | `string[]` | No | Array of social media URLs |
| `isPublished` | `boolean` | No | Default `true` |

**Response (`data`):** `ContentResponseDto`

---

### Update Content Page

`PATCH /admin/content/:slug` — **ADMIN**

**Request Body:** Partial — any fields from Create (all optional).

**Response (`data`):** `ContentResponseDto`

---

### Delete Content Page

`DELETE /admin/content/:slug` — **ADMIN**

**Response (`data`):**

```json
{
  "message": "Content deleted successfully"
}
```

---

## 19. Admin — Tickets (Admin Only)

### List All Tickets

`GET /admin/tickets` — **ADMIN**

**Query Parameters:**

| Param | Type | Required | Validation |
|-------|------|----------|------------|
| `status` | `string` | No | `open`, `in_progress`, `resolved`, `closed` |

**Response (`data`):**

```json
[
  {
    "id": "665f1a2b3c4d5e6f7a8b9c30",
    "userId": "665f1a2b3c4d5e6f7a8b9c0d",
    "userEmail": "user@example.com",
    "title": "App crashes on Pokédex",
    "description": "When I open Pokédex...",
    "status": "open",
    "attachments": [],
    "replies": [],
    "createdAt": "2026-04-06T12:00:00.000Z",
    "updatedAt": "2026-04-06T12:00:00.000Z"
  }
]
```

---

### Get Ticket Detail (Admin)

`GET /admin/tickets/:id` — **ADMIN**

**Response (`data`):** Same shape as above with `userId` and `userEmail`.

---

### Reply to Ticket

`POST /admin/tickets/:id/reply` — **ADMIN**

**Request Body:**

```json
{
  "message": "We are looking into this issue. Thank you for reporting."
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `message` | `string` | Yes | 1–2000 characters |

**Response (`data`):** Updated `AdminTicketResponseDto` — status auto-changes to `in_progress`.

---

### Update Ticket Status

`PATCH /admin/tickets/:id/status` — **ADMIN**

**Request Body:**

```json
{
  "status": "resolved"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `status` | `string` | Yes | `open`, `in_progress`, `resolved`, `closed` |

**Response (`data`):** Updated `AdminTicketResponseDto`.

---

## 20. Files (Auth)

### Upload File

`POST /files/upload` — **AUTH REQUIRED**

> **Content-Type:** `multipart/form-data`

**Form Fields:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `file` | `file` | Yes | jpg, png, gif, webp, svg, bmp, tiff — Max 5MB |
| `category` | `text` | No | `profiles` or `general` |

**Response (`data`):**

```json
{
  "id": "665f1a2b3c4d5e6f7a8b9c15",
  "fileName": "upload-1234567890.jpg",
  "fileType": "image/jpeg",
  "category": "profiles",
  "fileSize": 245760,
  "url": "http://localhost:3000/uploads/profiles/upload-1234567890.jpg",
  "storageType": "local",
  "metadata": null,
  "createdAt": "2026-04-06T12:00:00.000Z"
}
```

---

### List My Files

`GET /files` — **AUTH REQUIRED**

**Query Parameters:**

| Param | Type | Required |
|-------|------|----------|
| `category` | `string` | No (`profiles` or `general`) |

**Response (`data`):**

```json
[
  {
    "id": "665f1a2b3c4d5e6f7a8b9c15",
    "fileName": "upload-1234567890.jpg",
    "fileType": "image/jpeg",
    "category": "profiles",
    "fileSize": 245760,
    "url": "http://localhost:3000/uploads/profiles/upload-1234567890.jpg",
    "storageType": "local",
    "metadata": null,
    "createdAt": "2026-04-06T12:00:00.000Z"
  }
]
```

---

### Get File by ID

`GET /files/:id` — **AUTH REQUIRED**

**Path Parameters:**

| Param | Type | Validation |
|-------|------|------------|
| `id` | `string` | MongoDB ObjectId |

**Response (`data`):** Same `FileResponseDto` shape as above.

---

### Delete File

`DELETE /files/:id` — **AUTH REQUIRED**

> Soft-delete — file remains on disk but is marked inactive.

**Path Parameters:**

| Param | Type | Validation |
|-------|------|------------|
| `id` | `string` | MongoDB ObjectId |

**Response (`data`):**

```json
{
  "message": "File deleted successfully"
}
```

---

## Quick Reference — All Endpoints

### Auth & Session

| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| 1 | `POST` | `/auth/register` | Public | Register with email + password |
| 2 | `POST` | `/auth/verify-otp` | Public | Verify 6-digit OTP |
| 3 | `POST` | `/auth/resend-otp` | Public | Resend OTP (60s cooldown) |
| 4 | `POST` | `/auth/create-profile` | JWT | Complete profile (multipart) |
| 5 | `POST` | `/auth/login` | Public | Login → tokens + profile |
| 6 | `POST` | `/auth/social` | Public | Social login/register (Firebase) |
| 7 | `POST` | `/auth/forgot-password` | Public | Send password reset OTP |
| 8 | `POST` | `/auth/reset-password` | Public | Reset password with OTP |
| 9 | `POST` | `/auth/refresh` | Public | Refresh tokens |
| 10 | `POST` | `/auth/logout` | JWT | Logout — revoke current session |

### User Profile

| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| 11 | `GET` | `/users/me` | JWT | Get my profile |
| 12 | `PATCH` | `/users/me` | JWT | Update profile (multipart/JSON) |
| 13 | `DELETE` | `/users/me/profile-image` | JWT | Remove profile image |
| 14 | `DELETE` | `/users/me/account` | JWT | Delete account (soft-delete) |

### Settings

| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| 15 | `GET` | `/settings/notifications` | JWT | Get notification preferences |
| 16 | `PATCH` | `/settings/notifications` | JWT | Update notification toggle |
| 17 | `POST` | `/settings/change-password` | JWT | Change password (current + new) |

### Content (Public)

| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| 18 | `GET` | `/content/:slug` | Public | Get content page (terms/privacy/help) |

### Support Tickets

| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| 19 | `POST` | `/tickets` | JWT | Submit support ticket (multipart) |
| 20 | `GET` | `/tickets` | JWT | List my tickets |
| 21 | `GET` | `/tickets/:id` | JWT | Get ticket detail |

### Pokédex

| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| 22 | `GET` | `/pokedex` | Public | List Pokémon (paginated, filterable) |
| 23 | `GET` | `/pokedex/trending` | Public | Trending Pokémon |
| 24 | `GET` | `/pokedex/search` | Public | Search by name |
| 25 | `GET` | `/pokedex/:id` | Public | Full Pokémon detail |
| 26 | `GET` | `/pokedex/:id/neighbors` | Public | Prev/next for swipe nav |

### Rankings

| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| 27 | `GET` | `/rankings` | Public | Rankings list (paginated) |
| 28 | `GET` | `/rankings/:pokemonId` | Public | Ranking detail |

### Raids & Counter

| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| 29 | `GET` | `/raids` | Public | List active raid bosses |
| 30 | `GET` | `/raids/:bossId` | Public | Raid boss full detail |
| 31 | `GET` | `/raids/queues` | JWT | My saved raid teams |
| 32 | `POST` | `/raids/:bossId/queue` | JWT | Save counter team |
| 33 | `DELETE` | `/raids/queues/:queueId` | JWT | Delete saved team |

### Name Generator

| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| 34 | `POST` | `/name-generator/generate` | Public | Generate PvP name |
| 35 | `GET` | `/name-generator/presets` | JWT | My saved presets |
| 36 | `POST` | `/name-generator/presets` | JWT | Save preset |
| 37 | `DELETE` | `/name-generator/presets/:id` | JWT | Delete preset |

### Ranking History

| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| 38 | `GET` | `/history/stats` | JWT | Battle history stats |
| 39 | `GET` | `/history` | JWT | Ranking history list |
| 40 | `GET` | `/history/:entryId/detail` | JWT | History entry detail |
| 41 | `GET` | `/history/:pokemonId/trend` | JWT | Pokémon rank trend |
| 42 | `GET` | `/history/teams` | JWT | Saved teams list |
| 43 | `GET` | `/history/export` | JWT | Export history as JSON |
| 44 | `DELETE` | `/history/:entryId` | JWT | Delete history entry |

### Recommendations

| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| 45 | `POST` | `/recommendations` | JWT | Generate recommendations |

### Events

| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| 46 | `GET` | `/events` | Public | List events |
| 47 | `GET` | `/events/:id` | Public | Event detail |

### Admin — Events

| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| 48 | `GET` | `/admin/events` | Admin | List all events (admin) |
| 49 | `POST` | `/admin/events` | Admin | Create event |
| 50 | `PATCH` | `/admin/events/:id` | Admin | Update event |
| 51 | `DELETE` | `/admin/events/:id` | Admin | Delete event |
| 52 | `PATCH` | `/admin/events/:id/publish` | Admin | Publish event |
| 53 | `PATCH` | `/admin/events/:id/schedule` | Admin | Schedule event |
| 54 | `GET` | `/admin/events/:id/audit` | Admin | Event audit log |

### Admin — Content

| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| 55 | `GET` | `/admin/content` | Admin | List all content pages |
| 56 | `POST` | `/admin/content` | Admin | Create content page |
| 57 | `PATCH` | `/admin/content/:slug` | Admin | Update content page |
| 58 | `DELETE` | `/admin/content/:slug` | Admin | Delete content page |

### Admin — Tickets

| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| 59 | `GET` | `/admin/tickets` | Admin | List all tickets |
| 60 | `GET` | `/admin/tickets/:id` | Admin | Get ticket detail (admin) |
| 61 | `POST` | `/admin/tickets/:id/reply` | Admin | Reply to ticket |
| 62 | `PATCH` | `/admin/tickets/:id/status` | Admin | Update ticket status |

### Files

| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| 63 | `POST` | `/files/upload` | JWT | Upload file (multipart) |
| 64 | `GET` | `/files` | JWT | List my files |
| 65 | `GET` | `/files/:id` | JWT | Get file by ID |
| 66 | `DELETE` | `/files/:id` | JWT | Delete file (soft) |
