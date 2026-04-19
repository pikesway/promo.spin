# System Architecture Document: Standalone Reward Hub

**Document Version:** 1.0
**Date:** 2026-04-19
**Status:** Draft
**Prepared by:** Lead System Analyst

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Hub and Spoke Design Pattern](#2-hub-and-spoke-design-pattern)
3. [Technology Stack](#3-technology-stack)
4. [Application Layer Architecture](#4-application-layer-architecture)
5. [Database Schema](#5-database-schema)
6. [Row Level Security Model](#6-row-level-security-model)
7. [Edge Function Contracts](#7-edge-function-contracts)
8. [Spoke Integration Design](#8-spoke-integration-design)
9. [Redemption State Machine](#9-redemption-state-machine)
10. [Security Architecture](#10-security-architecture)
11. [Frontend Architecture](#11-frontend-architecture)
12. [Notification Architecture](#12-notification-architecture)
13. [Analytics Architecture](#13-analytics-architecture)
14. [Migration from Coupled System](#14-migration-from-coupled-system)
15. [Deployment Architecture](#15-deployment-architecture)
16. [Component Inventory](#16-component-inventory)

---

## 1. Architecture Overview

The Reward Hub is a multi-tenant SaaS application structured around a **hub-and-spoke integration model**. The hub owns all reward catalog definitions, redemption code lifecycle, audit history, and staff-facing management UI. External spoke applications own their own engagement logic and call the hub via a REST API when a reward should be issued.

### Core Design Principles

- **Single source of truth for reward state.** No redemption state lives in spoke applications.
- **Spoke independence.** Spokes operate without the hub (they only call the hub at the moment of reward issuance).
- **Immutable audit trail.** Every state transition is permanently logged.
- **Multi-tenant isolation.** All data is scoped to client → brand with RLS enforced at the database layer.
- **Stateless API layer.** Edge functions are stateless; all state is in the database.
- **Security by depth.** Short code (public) + token (secret) + status check (server) for every redemption operation.

---

## 2. Hub and Spoke Design Pattern

```
                    ┌──────────────────────────────────────────────┐
                    │              REWARD HUB APPLICATION          │
                    │                                              │
                    │  ┌──────────────┐    ┌────────────────────┐ │
                    │  │  Admin UI     │    │   Public           │ │
                    │  │  (React SPA)  │    │   Redemption Page  │ │
                    │  └──────┬───────┘    └────────┬───────────┘ │
                    │         │                     │             │
                    │  ┌──────▼─────────────────────▼──────────┐ │
                    │  │         Supabase Edge Functions        │ │
                    │  │                                        │ │
                    │  │  issue-redemption  mark-redeemed       │ │
                    │  │  admin-redemptions  send-notification  │ │
                    │  └──────────────────┬─────────────────────┘ │
                    │                     │                        │
                    │  ┌──────────────────▼─────────────────────┐ │
                    │  │           Supabase PostgreSQL           │ │
                    │  │  (RLS-enforced multi-tenant database)   │ │
                    │  └────────────────────────────────────────┘ │
                    │                                              │
                    │  ┌──────────────────────────────────────┐   │
                    │  │      Spoke REST API Gateway           │   │
                    │  │  POST /api/v1/redemptions/issue       │   │
                    │  └─────────────────────┬────────────────┘   │
                    └────────────────────────┼────────────────────┘
                                             │
              ┌──────────────────────────────┼────────────────────────┐
              │                              │                        │
   ┌──────────▼────────┐         ┌───────────▼────────┐    ┌─────────▼──────────┐
   │   LOYALTY CARD    │         │   TRIVIA GAME       │    │   FUTURE SPOKE     │
   │   SPOKE (Spoke 1) │         │   SPOKE (Spoke 2)   │    │   APPLICATION      │
   │                   │         │                     │    │                    │
   │  - Stamp logic    │         │  - Question/answer  │    │  - Custom logic    │
   │  - Member card UI │         │  - Score tracking   │    │  - Reward trigger  │
   │  - Visit confirm  │         │  - Leaderboard      │    │                    │
   └───────────────────┘         └─────────────────────┘    └────────────────────┘
```

### Data Ownership Boundary

| Data Type | Owner |
|-----------|-------|
| Reward definitions (catalog) | Hub |
| Issued redemption codes | Hub |
| Redemption state and history | Hub |
| Staff and admin users | Hub |
| Member enrollment | Spoke |
| Stamp / visit progress | Spoke |
| Game scores and results | Spoke |
| Birthday tracking | Spoke |
| Bonus rule scheduling | Spoke |

### Integration Contract

```
Spoke → Hub:
  "Member [external_id] has earned reward [catalog_item_id].
   Here is their contact info for notification."

Hub → Spoke:
  "Here is the short code [ABC123], token [uuid], and
   redemption URL. Display this to the member."

Hub → Spoke (optional webhook):
  "Redemption [ABC123] was marked as redeemed at [timestamp]."
```

---

## 3. Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | React 18 + Vite | Fast SPA with component-level code splitting |
| Styling | Tailwind CSS | Utility-first, consistent design tokens |
| Animation | Framer Motion | Micro-interactions and state transitions |
| Database | Supabase (PostgreSQL 15) | RLS-native, real-time, edge-compatible |
| Auth | Supabase Auth (email/password) | Built-in session management, JWT-based |
| API / Business Logic | Supabase Edge Functions (Deno) | Serverless, co-located with database |
| File Storage | Supabase Storage | Brand logos and assets |
| Email | Supabase Edge Function + provider | Async, provider-agnostic |
| Hosting | Supabase + Netlify/Vercel | Static frontend, edge function backend |

---

## 4. Application Layer Architecture

### 4.1 Layer Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                              │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    React SPA                          │  │
│  │                                                      │  │
│  │  ┌──────────────┐  ┌───────────────┐  ┌──────────┐  │  │
│  │  │  Admin Routes │  │ Public Routes │  │ Auth     │  │  │
│  │  │  (protected) │  │ (no auth)     │  │ Context  │  │  │
│  │  └──────┬───────┘  └──────┬────────┘  └──────────┘  │  │
│  │         │                 │                          │  │
│  │  ┌──────▼─────────────────▼────────────────────┐    │  │
│  │  │           Context / State Layer              │    │  │
│  │  │  RedemptionContext, CatalogContext, etc.     │    │  │
│  │  └──────────────────────┬──────────────────────┘    │  │
│  │                         │                            │  │
│  │  ┌──────────────────────▼──────────────────────┐    │  │
│  │  │         Supabase JS Client Layer             │    │  │
│  │  │  (supabase-js: auth, db queries, realtime)   │    │  │
│  │  └──────────────────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │ HTTPS
┌─────────────────────────────▼───────────────────────────────┐
│                   SUPABASE PLATFORM                         │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐ │
│  │  Auth Service │  │  Edge Funcs  │  │  Realtime Engine  │ │
│  └──────────────┘  └──────┬───────┘  └───────────────────┘ │
│                           │                                 │
│  ┌────────────────────────▼───────────────────────────────┐ │
│  │                  PostgreSQL 15                         │ │
│  │             (Row Level Security enabled)               │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  Storage Buckets                      │  │
│  │  brand-logos/  redemption-assets/                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Route Structure

```
/                          → Redirect to /login or /dashboard
/login                     → Email/password login
/signup                    → New account registration (invite-only for staff)

/dashboard                 → Client Admin home (metrics overview)
/catalog                   → Reward catalog management
/catalog/new               → Create new reward item
/catalog/:id               → Edit reward item

/spokes                    → Registered spoke management
/spokes/new                → Register new spoke
/spokes/:id                → Edit/rotate key for spoke

/redemptions               → Redemption log (filterable)
/redemptions/:shortCode    → Individual redemption detail

/brands                    → Brand management
/brands/:id                → Brand settings and branding

/users                     → Staff user management
/settings                  → Client account settings
/analytics                 → Reporting dashboard

/redeem/:shortCode         → Public redemption page (no auth)
```

---

## 5. Database Schema

### 5.1 Entity Relationship Diagram

```
clients (1)────────(many) brands
    │                        │
    │                    (many)
    │                  spoke_registrations
    │                        │
    └──(many)           reward_catalog_items
       profiles                  │
                            (many)
                          redemptions ────── redemption_events (audit)
                                │
                       spoke_webhook_deliveries
```

### 5.2 Table Definitions

---

#### `clients`

```sql
CREATE TABLE IF NOT EXISTS clients (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  slug            text UNIQUE NOT NULL,
  plan            text NOT NULL DEFAULT 'starter',
  is_active       boolean NOT NULL DEFAULT true,
  settings        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
```

**Purpose:** Top-level tenant account. All data is scoped to a client.

---

#### `brands`

```sql
CREATE TABLE IF NOT EXISTS brands (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name            text NOT NULL,
  slug            text NOT NULL,
  logo_url        text,
  primary_color   text NOT NULL DEFAULT '#000000',
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, slug)
);
```

**Purpose:** Sub-organization within a client. Reward catalogs and spokes are brand-scoped.

---

#### `profiles`

```sql
CREATE TABLE IF NOT EXISTS profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id       uuid REFERENCES clients(id),
  full_name       text,
  role            text NOT NULL DEFAULT 'staff'
                  CHECK (role IN ('platform_admin', 'client_admin', 'brand_manager', 'staff')),
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
```

---

#### `profile_brand_permissions`

```sql
CREATE TABLE IF NOT EXISTS profile_brand_permissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  brand_id        uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(profile_id, brand_id)
);
```

**Purpose:** Grants a staff/manager access to specific brands.

---

#### `spoke_registrations`

```sql
CREATE TABLE IF NOT EXISTS spoke_registrations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  brand_id        uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  spoke_type      text NOT NULL DEFAULT 'custom',
  api_key_hash    text NOT NULL,
  api_key_prefix  text NOT NULL,
  webhook_url     text,
  webhook_secret  text,
  is_active       boolean NOT NULL DEFAULT true,
  last_used_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
```

**Purpose:** Each registered spoke application. API key is stored as a bcrypt hash; only the prefix is stored in plain text for identification.

**Notes:**
- `api_key_prefix` — First 8 characters of the raw key, used to identify key in logs without exposing it
- `api_key_hash` — bcrypt hash of the full raw key
- `webhook_url` — Optional URL the hub will POST state-change events to
- `webhook_secret` — HMAC signing secret for webhook payloads

---

#### `reward_catalog_items`

```sql
CREATE TABLE IF NOT EXISTS reward_catalog_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  brand_id        uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  reward_type     text NOT NULL DEFAULT 'custom'
                  CHECK (reward_type IN ('free_item', 'discount', 'vip_access', 'birthday', 'custom')),
  reward_value    text,
  expiry_days     integer NOT NULL DEFAULT 30,
  is_active       boolean NOT NULL DEFAULT true,
  sort_order      integer NOT NULL DEFAULT 0,
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
```

**Purpose:** The catalog of reward definitions. Spokes reference items by ID when triggering reward issuance.

---

#### `redemptions`

```sql
CREATE TABLE IF NOT EXISTS redemptions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           uuid NOT NULL REFERENCES clients(id),
  brand_id            uuid NOT NULL REFERENCES brands(id),
  spoke_id            uuid NOT NULL REFERENCES spoke_registrations(id),
  catalog_item_id     uuid NOT NULL REFERENCES reward_catalog_items(id),
  short_code          text NOT NULL UNIQUE,
  token               text NOT NULL UNIQUE,
  status              text NOT NULL DEFAULT 'valid'
                      CHECK (status IN ('valid', 'redeemed', 'expired')),
  member_external_id  text,
  member_name         text,
  member_email        text,
  member_phone        text,
  reward_name         text NOT NULL,
  issued_at           timestamptz NOT NULL DEFAULT now(),
  expires_at          timestamptz NOT NULL,
  redeemed_at         timestamptz,
  redeemed_by_user_id uuid REFERENCES profiles(id),
  redeemed_by_label   text,
  email_status        text NOT NULL DEFAULT 'pending'
                      CHECK (email_status IN ('pending', 'sent', 'failed', 'skipped')),
  email_sent_at       timestamptz,
  metadata            jsonb NOT NULL DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
```

**Purpose:** Central table for all issued redemption codes. One row per issued reward.

**Short Code Generation:**
- 6 characters from unambiguous set: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no 0, O, 1, I)
- Must be globally unique
- Generated in edge function using crypto.getRandomValues()

**Token Generation:**
- UUID v4 via `crypto.randomUUID()`
- Used as a secret to authorize the mark-as-redeemed action
- Stored in plain text (it is itself the access control mechanism)

---

#### `redemption_events`

```sql
CREATE TABLE IF NOT EXISTS redemption_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  redemption_id   uuid NOT NULL REFERENCES redemptions(id) ON DELETE CASCADE,
  event_type      text NOT NULL
                  CHECK (event_type IN ('issued', 'viewed', 'redeemed', 'expired', 'email_sent', 'email_failed', 'webhook_sent', 'webhook_failed')),
  actor_type      text NOT NULL
                  CHECK (actor_type IN ('system', 'staff_user', 'spoke_api', 'public')),
  actor_id        text,
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);
```

**Purpose:** Immutable append-only audit log. Every action on a redemption writes a row here.

---

#### `spoke_webhook_deliveries`

```sql
CREATE TABLE IF NOT EXISTS spoke_webhook_deliveries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spoke_id        uuid NOT NULL REFERENCES spoke_registrations(id),
  redemption_id   uuid NOT NULL REFERENCES redemptions(id),
  event_type      text NOT NULL,
  payload         jsonb NOT NULL,
  attempt_count   integer NOT NULL DEFAULT 0,
  last_attempted_at timestamptz,
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'delivered', 'failed')),
  response_code   integer,
  response_body   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
```

**Purpose:** Tracks all outbound webhook delivery attempts to spokes.

---

#### `notification_log`

```sql
CREATE TABLE IF NOT EXISTS notification_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  redemption_id   uuid NOT NULL REFERENCES redemptions(id),
  channel         text NOT NULL DEFAULT 'email'
                  CHECK (channel IN ('email', 'sms', 'push')),
  recipient       text NOT NULL,
  subject         text,
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'sent', 'failed')),
  attempt_count   integer NOT NULL DEFAULT 0,
  last_attempted_at timestamptz,
  sent_at         timestamptz,
  error_message   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
```

---

### 5.3 Indexes

```sql
CREATE INDEX idx_redemptions_short_code ON redemptions(short_code);
CREATE INDEX idx_redemptions_client_brand ON redemptions(client_id, brand_id);
CREATE INDEX idx_redemptions_spoke_id ON redemptions(spoke_id);
CREATE INDEX idx_redemptions_status ON redemptions(status) WHERE status = 'valid';
CREATE INDEX idx_redemptions_expires_at ON redemptions(expires_at) WHERE status = 'valid';
CREATE INDEX idx_redemptions_member_email ON redemptions(member_email);
CREATE INDEX idx_redemption_events_redemption_id ON redemption_events(redemption_id);
CREATE INDEX idx_catalog_items_brand ON reward_catalog_items(brand_id, is_active);
CREATE INDEX idx_spokes_client_id ON spoke_registrations(client_id);
CREATE UNIQUE INDEX idx_spokes_api_prefix ON spoke_registrations(api_key_prefix);
```

---

## 6. Row Level Security Model

### 6.1 Principles

- All tables have RLS enabled
- `auth.uid()` is used for all identity checks (never `current_user`)
- `platform_admin` role bypasses via a helper function, not `USING (true)`
- Anonymous access is restricted to the redemption page read (by short code + token match)

### 6.2 Helper Functions

```sql
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'platform_admin' AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION get_my_client_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_id FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION can_access_brand(p_brand_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profile_brand_permissions
    WHERE profile_id = auth.uid() AND brand_id = p_brand_id
  )
  OR EXISTS (
    SELECT 1 FROM profiles p
    JOIN brands b ON b.client_id = p.client_id
    WHERE p.id = auth.uid()
      AND b.id = p_brand_id
      AND p.role IN ('client_admin', 'brand_manager')
  )
  OR is_platform_admin();
$$;
```

### 6.3 Key RLS Policies

**redemptions — SELECT (public read by token)**

```sql
CREATE POLICY "Public can read redemption by short_code and token"
  ON redemptions FOR SELECT
  TO anon
  USING (true); -- Read is unrestricted; security enforced at API layer via token check
-- NOTE: The edge function performs the token verification; the public policy allows the initial read.
-- For higher security, consider restricting to a DB function that checks both fields together.
```

**redemptions — SELECT (authenticated staff)**

```sql
CREATE POLICY "Staff can view redemptions for permitted brands"
  ON redemptions FOR SELECT
  TO authenticated
  USING (
    is_platform_admin()
    OR (client_id = get_my_client_id() AND can_access_brand(brand_id))
  );
```

**reward_catalog_items — SELECT/INSERT/UPDATE**

```sql
CREATE POLICY "Client admins can manage their catalog"
  ON reward_catalog_items FOR SELECT
  TO authenticated
  USING (
    is_platform_admin()
    OR client_id = get_my_client_id()
  );

CREATE POLICY "Client admins can insert catalog items"
  ON reward_catalog_items FOR INSERT
  TO authenticated
  WITH CHECK (
    is_platform_admin()
    OR (
      client_id = get_my_client_id()
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role IN ('client_admin', 'platform_admin')
      )
    )
  );
```

**spoke_registrations — full client admin control**

```sql
CREATE POLICY "Client admins manage their spokes"
  ON spoke_registrations FOR SELECT
  TO authenticated
  USING (
    is_platform_admin()
    OR client_id = get_my_client_id()
  );
```

---

## 7. Edge Function Contracts

### 7.1 `issue-redemption`

**Purpose:** Called by spoke applications to generate a new redemption code.

**Endpoint:** `POST /functions/v1/issue-redemption`

**Authentication:** `Authorization: Bearer {spoke_api_key}` (not a Supabase JWT)

**Processing:**

```
1. Extract API key from Authorization header
2. Hash API key (bcrypt)
3. Lookup spoke_registrations where api_key_hash matches
   → 401 if not found
   → 403 if is_active = false
4. Validate catalog_item_id belongs to spoke's brand and is active
   → 404 if not found or inactive
5. Generate short_code (6 chars, retry on collision)
6. Generate token (UUID)
7. Calculate expires_at = now() + (catalog_item.expiry_days * 86400 seconds)
8. INSERT INTO redemptions (service role)
9. INSERT INTO redemption_events (event_type = 'issued', actor_type = 'spoke_api')
10. UPDATE spoke_registrations.last_used_at = now()
11. Enqueue email notification (async via send-notification function)
12. Return short_code, token, redemption_url, expires_at
```

**Request Body:**

```typescript
interface IssueRedemptionRequest {
  reward_catalog_id: string;
  member: {
    external_id: string;
    name?: string;
    email?: string;
    phone?: string;
  };
  metadata?: Record<string, unknown>;
}
```

**Response:**

```typescript
interface IssueRedemptionResponse {
  redemption_id: string;
  short_code: string;
  token: string;
  redemption_url: string;
  reward_name: string;
  expires_at: string;
  issued_at: string;
}
```

---

### 7.2 `mark-redeemed`

**Purpose:** Marks a redemption as claimed. Called from public page or staff dashboard.

**Endpoint:** `POST /functions/v1/mark-redeemed`

**Authentication:** None required (anon key). Security via short_code + token pair.

**Processing:**

```
1. Receive { shortCode, token, redeemedByLabel? }
2. Lookup redemption by short_code
   → 404 if not found
3. Verify redemption.token === token
   → 403 if mismatch
4. Check status = 'valid'
   → 400 with { error: 'already_redeemed', redeemed_at: ... } if status = 'redeemed'
   → 400 with { error: 'expired' } if status = 'expired'
5. Check expires_at >= now()
   → 400 with { error: 'expired' } if past expiry
6. UPDATE redemptions:
   - status = 'redeemed'
   - redeemed_at = now()
   - redeemed_by_label = redeemedByLabel || 'cashier'
7. INSERT INTO redemption_events (event_type = 'redeemed', actor_type = 'public')
8. Enqueue webhook delivery to spoke (async)
9. Return { success: true, prize_name, redeemed_at }
```

**Request Body:**

```typescript
interface MarkRedeemedRequest {
  shortCode: string;
  token: string;
  redeemedByLabel?: string;
}
```

---

### 7.3 `admin-mark-redeemed`

**Purpose:** Staff-authenticated version of mark-redeemed for use from admin dashboard.

**Endpoint:** `POST /functions/v1/admin-mark-redeemed`

**Authentication:** Supabase JWT (authenticated user)

**Additional Logic:**
- Verify authenticated user has permission to access the redemption's brand
- Record `redeemed_by_user_id` from JWT
- Set `actor_type = 'staff_user'` in audit event

---

### 7.4 `expire-redemptions` (Scheduled)

**Purpose:** Bulk-expires overdue redemptions. Runs on a schedule (cron).

**Trigger:** Daily via pg_cron or external scheduler

**Processing:**

```sql
UPDATE redemptions
SET status = 'expired', updated_at = now()
WHERE status = 'valid'
  AND expires_at < now();

-- Bulk insert audit events for expired records
INSERT INTO redemption_events (redemption_id, event_type, actor_type)
SELECT id, 'expired', 'system'
FROM redemptions
WHERE status = 'expired'
  AND updated_at > now() - interval '1 hour'; -- Recently expired only
```

---

### 7.5 `send-notification`

**Purpose:** Sends email (or future channels) when a reward is issued.

**Endpoint:** `POST /functions/v1/send-notification`

**Authentication:** Called internally only (service role)

**Processing:**

```
1. Receive { redemptionId }
2. Fetch redemption with brand and catalog item
3. Check member_email is present
   → Mark email_status = 'skipped' if no email
4. Compose email with brand branding:
   - Subject: "Your {brand_name} Reward is Ready!"
   - Body: reward name, short code, QR code image, expiry date
5. Send via email provider
6. UPDATE redemptions.email_status = 'sent' | 'failed'
7. INSERT INTO notification_log
8. INSERT INTO redemption_events (event_type = 'email_sent' | 'email_failed')
```

---

### 7.6 `deliver-webhook`

**Purpose:** Delivers a webhook notification to a spoke application.

**Endpoint:** `POST /functions/v1/deliver-webhook`

**Processing:**

```
1. Receive { webhookDeliveryId }
2. Fetch spoke_webhook_deliveries record
3. Fetch spoke's webhook_url and webhook_secret
4. Compute HMAC-SHA256 signature over payload
5. POST to spoke webhook_url with:
   - X-Hub-Signature-256: sha256={signature}
   - Content-Type: application/json
   - Payload: redemption event JSON
6. If HTTP 2xx → UPDATE status = 'delivered'
7. If failure and attempt_count < 3:
   - Increment attempt_count
   - Schedule retry with exponential backoff
8. If failure and attempt_count >= 3:
   - UPDATE status = 'failed'
   - INSERT redemption_event (webhook_failed)
```

---

## 8. Spoke Integration Design

### 8.1 Loyalty Card Spoke — Integration Pattern

The loyalty card application (existing spoke) integrates with the hub as follows:

```
EXISTING LOYALTY CARD APP:
  ┌─────────────────────────────────────────────────────┐
  │  When member reaches threshold:                     │
  │                                                     │
  │  1. Record threshold-crossing in loyalty DB         │
  │  2. Call hub API:                                   │
  │     POST /api/v1/redemptions/issue                  │
  │     {                                               │
  │       reward_catalog_id: "{hub catalog item id}",  │
  │       member: {                                     │
  │         external_id: "{loyalty_account.id}",        │
  │         name: "{member.name}",                     │
  │         email: "{member.email}"                     │
  │       },                                            │
  │       metadata: {                                   │
  │         source: "loyalty_card",                     │
  │         campaign_id: "{campaign.id}",               │
  │         tier_id: "{reward_tier.id}"                 │
  │       }                                             │
  │     }                                               │
  │  3. Display returned short_code + redemption_url    │
  │     on loyalty card screen                          │
  └─────────────────────────────────────────────────────┘
```

### 8.2 Catalog Item Mapping

The loyalty card spoke must store a mapping from its internal reward tier IDs to the hub's `reward_catalog_item` IDs. This can be stored in the spoke's own database:

```
loyalty_program_reward_tiers (spoke DB)
  id: uuid
  campaign_id: uuid
  name: "Free Coffee"
  threshold: 10
  hub_catalog_item_id: uuid  ← References hub's reward_catalog_items.id
```

### 8.3 Webhook Receiver (Spoke Side)

The loyalty card spoke should implement a webhook endpoint to receive redemption state changes from the hub:

```typescript
// POST /webhooks/hub-redemption
// Headers: X-Hub-Signature-256: sha256={hmac}

interface HubWebhookPayload {
  event: 'redemption.issued' | 'redemption.redeemed' | 'redemption.expired';
  redemption_id: string;
  short_code: string;
  spoke_id: string;
  member_external_id: string;
  reward_name: string;
  occurred_at: string;
}
```

On receiving `redemption.redeemed`, the loyalty spoke can update its own state to reflect the claim (e.g., clearing the `reward_unlocked` flag on the loyalty account).

---

## 9. Redemption State Machine

```
                    ┌──────────────────┐
                    │    REQUESTED     │
                    │  (in-flight API) │
                    └────────┬─────────┘
                             │ INSERT redemption
                             ▼
                    ┌──────────────────┐
            ┌──────►│     VALID        │◄──────────┐
            │       │  (status=valid)  │           │
            │       └────────┬─────────┘           │
            │                │                     │
            │    Mark as     │      Expiry         │
            │    Redeemed    │      passes          │
            │                │                     │
            │       ┌────────▼──────┐   ┌──────────▼──────┐
            │       │   REDEEMED    │   │    EXPIRED       │
            │       │ (terminal)    │   │  (terminal)      │
            │       └───────────────┘   └─────────────────┘
            │
      Code generated
      (new issuance)
```

### 9.1 State Transition Rules

| From | To | Trigger | Actor |
|------|----|---------|-------|
| — | `valid` | Spoke calls issue endpoint | Spoke API |
| `valid` | `redeemed` | Mark-as-redeemed called with valid token | Public / Staff |
| `valid` | `expired` | expires_at passes | System (scheduled job) |
| `redeemed` | — | Immutable | — |
| `expired` | — | Immutable | — |

### 9.2 Concurrent Request Safety

The mark-as-redeemed operation uses a conditional UPDATE to prevent race conditions:

```sql
UPDATE redemptions
SET
  status = 'redeemed',
  redeemed_at = now(),
  redeemed_by_label = $1
WHERE
  short_code = $2
  AND token = $3
  AND status = 'valid'
  AND expires_at > now()
RETURNING *;
```

If 0 rows are returned, the code was either already redeemed, expired, or the token was invalid. The function then fetches the record to return the appropriate error.

---

## 10. Security Architecture

### 10.1 Security Layers

```
Layer 1: HTTPS (all traffic encrypted in transit)
Layer 2: Supabase Auth (JWT for admin users)
Layer 3: Row Level Security (database-level multi-tenant isolation)
Layer 4: Spoke API Key (bcrypt-hashed, per-spoke, rotatable)
Layer 5: Redemption Token (UUID, secret, per-redemption)
Layer 6: Short Code + Token pairing (dual factor for public redemption)
Layer 7: Rate limiting (per-IP, per-spoke)
Layer 8: Audit logging (immutable, complete)
```

### 10.2 Spoke API Key Design

```
Raw key format: hub_sk_{random_32_chars}
Example:        hub_sk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6

Stored in DB:   api_key_prefix = "hub_sk_a1" (first 8 chars, for log identification)
                api_key_hash   = bcrypt(raw_key, rounds=12)

API Key Rotation:
  1. Client Admin requests rotation
  2. New raw key generated and returned ONCE to admin
  3. New bcrypt hash stored in spoke_registrations
  4. Old key immediately invalidated
  5. Rotation logged in audit trail
```

### 10.3 Token Security

The redemption token is a UUID stored in plain text in the `redemptions` table. Access control is as follows:

- The token is only exposed in the API response at issuance time
- It is included in the redemption URL query parameter (`?token=...`)
- The mark-as-redeemed endpoint requires both the short code AND the token to proceed
- The token cannot be brute-forced because short codes are also required (6^32 combinations with UUID)
- Staff who find a short code on the admin dashboard can mark it redeemed without the token (they are authenticated via JWT and have brand permission)

### 10.4 Rate Limiting

| Endpoint | Limit |
|----------|-------|
| `issue-redemption` | 100 req/min per API key |
| `mark-redeemed` (public) | 20 req/min per IP |
| `admin-mark-redeemed` | 60 req/min per user |
| Login | 5 attempts per minute per IP |

---

## 11. Frontend Architecture

### 11.1 Page and Component Tree

```
App
├── AuthContext (session, user, role)
├── ThemeContext (brand theming for public pages)
│
├── Public Routes (no auth)
│   └── RedemptionPage
│       ├── BrandHeader (logo, name, color from redemption.brand)
│       ├── RedemptionCard
│       │   ├── StatusBadge (Valid / Redeemed / Expired)
│       │   ├── ShortCodeDisplay
│       │   ├── RewardDetails
│       │   └── CountdownTimer (expires_at)
│       └── MarkRedeemedButton
│           └── ConfirmationDialog
│
└── Protected Routes (auth required)
    ├── AppLayout
    │   ├── GlobalHeader
    │   └── MobileBottomNav
    │
    ├── Dashboard (metrics overview)
    │
    ├── CatalogPage
    │   ├── CatalogList
    │   └── CatalogItemForm (create/edit)
    │
    ├── SpokesPage
    │   ├── SpokeList
    │   └── SpokeForm
    │       └── ApiKeyDisplay (shown once on create/rotate)
    │
    ├── RedemptionsPage
    │   ├── RedemptionFilters
    │   ├── RedemptionTable
    │   └── RedemptionDetailDrawer
    │       ├── AuditTimeline
    │       └── MarkRedeemedButton (staff action)
    │
    ├── BrandsPage
    │   └── BrandForm (logo, color, name)
    │
    ├── UsersPage
    │   └── UserForm (invite staff, assign brand permissions)
    │
    └── AnalyticsPage
        ├── MetricCards (issued, redeemed, expired, redemption rate)
        ├── RedemptionsOverTimeChart
        ├── RedemptionsBySpoke Chart
        └── ExportButton
```

### 11.2 State Management

Context providers used:

| Context | Scope | Provides |
|---------|-------|----------|
| `AuthContext` | Global | `user`, `profile`, `role`, `signIn`, `signOut` |
| `ThemeContext` | Public pages | Brand colors, logo for public redemption page |
| `RedemptionContext` | Redemptions section | Redemption list, search, filter state |
| `CatalogContext` | Catalog section | Catalog items, CRUD handlers |

No external state management library (Redux, Zustand) is required given the scope.

### 11.3 Supabase Client Setup

```javascript
// src/supabase/client.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

All edge function calls from the frontend use:
```javascript
const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/{function-name}`;
const headers = {
  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};
```

Spoke API calls (from spoke application, not hub frontend) use the spoke's own API key as the bearer token instead of the anon key.

---

## 12. Notification Architecture

### 12.1 Email Flow

```
issue-redemption edge function
    │
    └── (async) POST /functions/v1/send-notification { redemptionId }
                    │
                    ├── Fetch redemption + brand + catalog item
                    ├── Build branded email HTML
                    ├── Call email provider (Resend / SendGrid / SMTP)
                    ├── UPDATE redemptions.email_status
                    ├── INSERT notification_log
                    └── INSERT redemption_events (email_sent / email_failed)
```

### 12.2 Email Template Requirements

The notification email MUST contain:

| Element | Source |
|---------|--------|
| Brand logo | `brands.logo_url` |
| Brand primary color | `brands.primary_color` |
| Business name | `brands.name` |
| Reward name | `redemptions.reward_name` |
| Short code (large text) | `redemptions.short_code` |
| Redemption URL | Constructed from hub domain + short_code + token |
| QR code image | Generated server-side from redemption URL |
| Expiry date | `redemptions.expires_at` formatted |

### 12.3 Provider Abstraction

The email provider should be abstracted behind a thin interface in the edge function to allow swapping providers:

```typescript
interface EmailProvider {
  send(opts: {
    to: string;
    subject: string;
    html: string;
    from: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }>;
}
```

---

## 13. Analytics Architecture

### 13.1 Pre-Computed Insights Cache

High-traffic analytics queries use a pre-computed cache to avoid expensive on-demand aggregations:

```sql
CREATE TABLE IF NOT EXISTS analytics_cache (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type      text NOT NULL CHECK (scope_type IN ('brand', 'client', 'platform')),
  scope_id        uuid NOT NULL,
  period          text NOT NULL DEFAULT 'all_time',
  data            jsonb NOT NULL DEFAULT '{}',
  computed_at     timestamptz NOT NULL DEFAULT now(),
  next_refresh_at timestamptz NOT NULL,
  UNIQUE(scope_type, scope_id, period)
);
```

**Cache structure (`data` field):**

```json
{
  "total_issued": 1243,
  "total_redeemed": 891,
  "total_expired": 47,
  "redemption_rate": 0.717,
  "avg_hours_to_redeem": 4.2,
  "by_spoke": [
    { "spoke_id": "uuid", "spoke_name": "Loyalty Card", "issued": 890, "redeemed": 654 }
  ],
  "by_reward_type": [
    { "reward_type": "free_item", "issued": 600, "redeemed": 480 }
  ],
  "daily_series": [
    { "date": "2026-04-01", "issued": 12, "redeemed": 9 }
  ]
}
```

### 13.2 Refresh Strategy

Cache is refreshed:
1. On a daily schedule via `compute-analytics` edge function
2. On-demand when a Client Admin explicitly requests refresh
3. Automatically invalidated when a redemption state changes (background update)

---

## 14. Migration from Coupled System

### 14.1 Migration Strategy

The existing loyalty program application has a tightly coupled redemption system. The migration to the hub-and-spoke model follows these steps:

**Phase 1 — Hub Deployment (New Application)**
1. Deploy the Reward Hub as a new standalone application
2. Create client and brand records mirroring the existing system
3. Create reward catalog items corresponding to existing loyalty reward tiers
4. Register the loyalty card application as a spoke in the hub

**Phase 2 — Dual-Write Period**
1. Modify the loyalty card application to:
   - Continue writing to its existing `redemptions` table (backward compatibility)
   - Also call the hub's `issue-redemption` API when a reward is unlocked
2. This creates a duplicate record in the hub but ensures the hub's data starts populating
3. Staff are directed to use the hub's public redemption page for new codes

**Phase 3 — Spoke-Only Mode**
1. Once hub is validated in production, remove the dual-write
2. The loyalty card application only calls the hub for redemption issuance
3. The loyalty card application's `redemptions` table is deprecated and archived

**Phase 4 — Legacy Data Migration (Optional)**
1. Migrate historical redemption records from the old table to the hub database
2. Backfill audit events where possible
3. Archive or read-only the old `redemptions` table

### 14.2 Data Mapping

| Old (Coupled System) | New (Hub) |
|---------------------|-----------|
| `redemptions.campaign_id` | Mapped via `spoke_registrations.id` → `brand_id` |
| `redemptions.prize_name` | `redemptions.reward_name` |
| `redemptions.short_code` | `redemptions.short_code` (same format) |
| `redemptions.redemption_token` | `redemptions.token` |
| `redemptions.metadata.loyalty_account_id` | `redemptions.member_external_id` |
| `campaign_rewards.id` | `reward_catalog_items.id` (new IDs, mapped in spoke) |

---

## 15. Deployment Architecture

### 15.1 Environments

| Environment | Purpose |
|-------------|---------|
| Development | Local Supabase + Vite dev server |
| Staging | Supabase staging project + preview deploy |
| Production | Supabase production + CDN-deployed SPA |

### 15.2 Environment Variables

```bash
# Frontend (Vite)
VITE_SUPABASE_URL=https://{project}.supabase.co
VITE_SUPABASE_ANON_KEY={anon_key}
VITE_APP_DOMAIN=https://rewards.yourdomain.com

# Edge Functions (automatically provided by Supabase)
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_DB_URL

# Edge Functions (manually configured secrets)
EMAIL_PROVIDER_API_KEY
EMAIL_FROM_ADDRESS
HUB_DOMAIN
```

### 15.3 CDN and Caching

- The React SPA is deployed to a CDN (Netlify/Vercel)
- Static assets (JS, CSS) are cache-busted per build
- The public redemption page (`/redeem/:shortCode`) MUST NOT be cached (dynamic content)
- Admin pages MUST NOT be cached (authenticated, dynamic)

---

## 16. Component Inventory

### 16.1 Edge Functions

| Function | Trigger | Auth Required |
|----------|---------|---------------|
| `issue-redemption` | Spoke API call | Spoke API key |
| `mark-redeemed` | Public page action | None (token-based) |
| `admin-mark-redeemed` | Admin dashboard | Supabase JWT |
| `expire-redemptions` | Daily scheduler | System (service role) |
| `send-notification` | Called internally | Service role |
| `deliver-webhook` | Called internally | Service role |
| `compute-analytics` | Daily scheduler | Service role |
| `admin-users` | Admin dashboard | Supabase JWT |
| `rotate-api-key` | Admin dashboard | Supabase JWT |

### 16.2 Frontend Pages

| Page | Route | Auth |
|------|-------|------|
| Redemption Page | `/redeem/:shortCode` | None |
| Login | `/login` | None |
| Dashboard | `/dashboard` | Required |
| Reward Catalog | `/catalog` | Required (Admin) |
| Spokes | `/spokes` | Required (Admin) |
| Redemptions Log | `/redemptions` | Required |
| Brands | `/brands` | Required (Admin) |
| Users | `/users` | Required (Admin) |
| Analytics | `/analytics` | Required (Admin) |

### 16.3 Database Tables

| Table | RLS | Description |
|-------|-----|-------------|
| `clients` | Yes | Top-level tenants |
| `brands` | Yes | Sub-organizations |
| `profiles` | Yes | User accounts |
| `profile_brand_permissions` | Yes | Brand-level access grants |
| `spoke_registrations` | Yes | Registered integrations |
| `reward_catalog_items` | Yes | Reward definitions |
| `redemptions` | Yes | Issued codes and state |
| `redemption_events` | Yes | Immutable audit trail |
| `spoke_webhook_deliveries` | Yes | Outbound webhook log |
| `notification_log` | Yes | Email/notification log |
| `analytics_cache` | Yes | Pre-computed metrics |

---

*Document prepared for internal use. Review with engineering and product leads before implementation begins.*
