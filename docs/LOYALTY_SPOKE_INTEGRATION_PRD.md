# Technical Integration PRD: Loyalty Spoke on the Smart Hub

**Status:** Draft v1.0
**Author:** Lead Systems Architect
**Date:** 2026-04-23
**Scope:** Upgrade the Hub (this platform) to become the authoritative source of truth for the new Loyalty Spoke. The Spoke renders UI only; all rules, state, telemetry, and reward minting live in the Hub.

---

## 0. Architecture Principles

1. **Hub = Brain.** Owns schema, rules, state, validation, cooldowns, lockouts, reward catalog, audit.
2. **Spoke = Skin.** Fetches a read-only `program_manifest` once per session, renders UI, POSTs events back to the Hub. Holds zero persistent state.
3. **Every Spoke → Hub call is authenticated** with a short-lived `session_token` scoped to a single `member_code` + `campaign_id`.
4. **All writes are idempotent** (client supplies `request_id`); the Hub dedupes.
5. **All time math is UTC, server-side.** The Spoke never decides whether a stamp is allowed.

---

## 1. Data Schema & Campaign Settings

### 1.1 What the old loyalty app stored (as-is)

The existing Hub already has the core loyalty tables (from `20260314131107_initialize_database_schema.sql` and the `20260315122325...` reward-catalog migration). Relevant tables:

| Table | Role |
|---|---|
| `loyalty_programs` | Per-campaign rule block (type, threshold, validation method + config, lockout, reset, birthday flags) |
| `loyalty_accounts` | Enrolled member (member_code, progress, birthday, totals) |
| `loyalty_progress_log` | Append-only audit of every visit/reward/reset (with `stamp_value`, `bonus_rule_id`) |
| `loyalty_redemptions` | Issued rewards (short_code, status, source, tier) |
| `validation_attempts` | Raw attempt log (success bool, device_info) |
| `validation_lockouts` | Active lockouts (locked_at / unlocked_at) |
| `loyalty_device_tokens` | Optional device remember-me |
| `campaign_rewards` | Multi-tier reward catalog (threshold, type, value, sort) |
| `campaign_bonus_rules` | Multiplier rules (day_of_week, time_window, custom_simple) |

The old app kept this almost entirely in `loyalty_programs` plus a loose JSONB on `campaigns.config.loyalty`. The Spoke migration **formalizes** that split: hot rule primitives become columns; presentation / UI copy stays in `campaigns.config`.

### 1.2 Required Hub upgrades (new columns / JSONB fields)

The PRD only prescribes **additive** changes — no destructive migrations, no data loss.

#### 1.2.1 `loyalty_programs` — new columns

| Column | Type | Default | Purpose |
|---|---|---|---|
| `stamp_unit` | `text` | `'stamp'` | UI label token: `'stamp' \| 'star' \| 'point' \| 'punch'` |
| `cool_down_seconds` | `integer` | `0` | Canonical cooldown (replaces loose `coolDownHours` in JSONB; still readable). `0` = none. |
| `cool_down_scope` | `text` | `'member'` | `'member'` (1 stamp/window/account) or `'device'` (per device_token) |
| `attempt_window_seconds` | `integer` | `900` | Sliding window for counting failed attempts |
| `lockout_duration_seconds` | `integer` | `0` | `0` = manager-unlock only; `>0` = auto-unlock after N seconds |
| `validation_config` (existing JSONB) | — | — | Shape formalized below |
| `bonus_config` | `jsonb` | `'{}'` | Non-rule-table bonus settings (birthday offset days, etc.) |
| `manifest_version` | `integer` | `1` | Bumped on any rule change; Spoke uses to invalidate cache |

```sql
ALTER TABLE loyalty_programs
  ADD COLUMN IF NOT EXISTS stamp_unit text NOT NULL DEFAULT 'stamp',
  ADD COLUMN IF NOT EXISTS cool_down_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cool_down_scope text NOT NULL DEFAULT 'member',
  ADD COLUMN IF NOT EXISTS attempt_window_seconds integer NOT NULL DEFAULT 900,
  ADD COLUMN IF NOT EXISTS lockout_duration_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS manifest_version integer NOT NULL DEFAULT 1;
```

RLS: existing `loyalty_programs` policies remain — no Spoke direct reads; Spoke only sees the manifest via Edge Function.

#### 1.2.2 Campaign Type — `program_type`

Existing column `loyalty_programs.program_type text` already constrained to `'visit' | 'action'`. Extend via check update:

- `'visit'` — 1 stamp per qualifying presence
- `'action'` — stamps per discrete action (purchase, engagement). Stamps count supplied per event (`quantity`), still capped server-side.

No schema change required; Spoke selects at build time.

#### 1.2.3 Thresholds — handled by `campaign_rewards`

`threshold` on `loyalty_programs` is the **primary** unlock. `campaign_rewards` rows with `active=true` are **additional tiers** (bronze 5 / silver 10 / gold 20). The Hub always returns `unlockedRewards[]` on cross, but does not mint without an explicit `loyalty_reward_unlocked` call (see §2.3).

#### 1.2.4 Validation methods — canonical `validation_config` JSONB

All four variants live in one typed JSONB. The Hub validates shape at write time using a check constraint.

```jsonc
// method = "pin"
{
  "pinLength": 4,                       // 4-6
  "pinType": "numeric",                 // "numeric" | "alphanumeric"
  "pinHash": "argon2id$...",            // NEW: stored as hash, never plaintext
  "pinSalt": "base64...",               // NEW
  "pinUpdatedAt": "2026-04-23T12:00:00Z"
}

// method = "icon_single"
{
  "targetIcon": "heart",                // id from LOYALTY_ICONS
  "gridSize": 16
}

// method = "icon_sequence"
{
  "iconSequence": ["heart","star","moon"],  // 2-5 ordered
  "gridSize": 16,
  "shuffleOnOpen": true
}

// method = "icon_position"
{
  "targetIcon": "heart",
  "targetPosition": "top-left",             // top-left|top-right|bottom-left|bottom-right
  "gridSize": 16
}
```

**Critical upgrade:** PINs are currently stored plaintext in `validation_config.pinValue`. Migration re-encodes them to `pinHash + pinSalt` (argon2id via `pgcrypto`/Deno bcrypt in the Edge Function). The Spoke **never** sees the secret; it POSTs the attempt and the Hub compares hashes.

#### 1.2.5 Bonus rules — three layers

| Layer | Where | Use |
|---|---|---|
| **Rule table** | `campaign_bonus_rules` (existing) | Day-of-week, time-window, custom multipliers |
| **Birthday** | `loyalty_programs.birthday_reward_*` + `bonus_config.birthdayWindowDays` | Already in schema; extend with window |
| **Inline config** | `loyalty_programs.bonus_config` | One-off flags (e.g., `{"firstVisitBonus": 2}`) |

Proposed `bonus_config` shape:

```jsonc
{
  "firstVisitBonus": 2,                 // stamps awarded on first ever visit
  "birthdayWindowDays": 7,              // +/- days around birthday eligible
  "maxStampsPerDay": 1,                 // hard ceiling regardless of multiplier
  "enrollmentBonus": { "stamps": 1 }
}
```

### 1.3 Manifest payload (Hub → Spoke)

Single read endpoint `GET /functions/v1/loyalty-manifest?campaign_id=...&member_code=...` returns everything the Spoke needs — the Spoke **MUST** cache only for `manifest_version`.

```jsonc
{
  "manifest_version": 7,
  "campaign": { "id": "...", "name": "...", "brand_id": "..." },
  "program": {
    "program_type": "visit",
    "threshold": 10,
    "stamp_unit": "stamp",
    "validation_method": "pin",
    "reset_behavior": "rollover",
    "cool_down_seconds": 43200,
    "cool_down_scope": "member",
    "lockout_threshold": 3,
    "attempt_window_seconds": 900,
    "lockout_duration_seconds": 0
  },
  "rewards": [
    { "tier_id": "...", "threshold": 5,  "name": "Free drip",   "type": "free_item" },
    { "tier_id": "...", "threshold": 10, "name": "Free latte",  "type": "free_item" }
  ],
  "ui": {
    "card":     { /* campaign.config.loyalty.card */ },
    "screens":  { /* campaign.config.screens */ }
  },
  "member": {                           // omitted if member_code not supplied
    "member_code": "A1B2C3D4",
    "current_progress": 3,
    "reward_unlocked": false,
    "locked": false,
    "next_stamp_available_at": null,
    "birthday_eligible": false
  },
  "validation_challenge": {             // the Spoke renders from this, never the secret
    "method": "pin",
    "pinLength": 4,
    "pinType": "numeric"
  }
}
```

Note the **absence** of `pinHash`, `targetIcon`, `iconSequence`, `targetPosition` for icon methods — those are held by the Hub. For icon methods, the Spoke receives the *shuffled grid order* only; the user's selection is posted back for server-side check.

---

## 2. Webhook / Event Contract

All Spoke → Hub events hit a single Edge Function namespace and share envelope.

### 2.0 Common envelope

```jsonc
// Request headers
Authorization: Bearer <session_token>        // short-lived, per session
X-Hub-Idempotency-Key: <uuid>                // client-generated per event
Content-Type: application/json

// Request body envelope
{
  "event":       "loyalty_stamp_requested",  // or other event name
  "campaign_id": "uuid",
  "member_code": "A1B2C3D4",
  "request_id":  "uuid",                     // same as idempotency key
  "client_ts":   "2026-04-23T12:00:00Z",
  "device":      { "id": "...", "ua": "...", "ip_hint": "..." },
  "payload":     { /* event-specific */ }
}
```

Response envelope:

```jsonc
{
  "success": true,
  "event": "loyalty_stamp_requested",
  "request_id": "uuid",
  "server_ts": "2026-04-23T12:00:00.123Z",
  "result": { /* event-specific */ },
  "error":  null                              // or { code, message, http_status }
}
```

### 2.1 `loyalty_session_started`

Spoke first call. Creates a `session_token` for a member_code + campaign_id pair (15 min TTL). Anonymous enrollment flows accept `member_code=null` and return a bootstrap token.

**Response `result`:**
```json
{ "session_token": "jwt.like.string", "expires_at": "...", "manifest_version": 7 }
```

### 2.2 `loyalty_stamp_requested`

Fires when staff submits the validation challenge in the Spoke UI.

**Request `payload`:**
```jsonc
{
  "action_type": "visit",                 // "visit" | "action"
  "quantity": 1,                          // action_type=action only; ignored for visit
  "validation": {
    "method": "pin",                      // must match manifest
    "attempt": "1234"                     // numeric or alphanumeric string
    // OR for icon methods:
    // "attempt": ["heart","star","moon"]           // icon_sequence
    // "attempt": "heart"                           // icon_single
    // "attempt": { "icon":"heart","position":"top-left" }  // icon_position
  },
  "validated_by_profile_id": "uuid|null", // staff member if known
  "bypass_cooldown": false                // manager override; requires manager PIN
}
```

**Server-side pipeline** (atomic, one edge function transaction):

1. Resolve session → member + campaign → program.
2. Check `validation_lockouts` (unlocked_at IS NULL). If locked → deny.
3. Check cooldown via `loyalty_progress_log` last `visit_confirmed` vs `cool_down_seconds`. If not elapsed and no bypass → `429` with `next_stamp_available_at`.
4. Compare attempt with hashed/stored `validation_config`. Log to `validation_attempts` (success bool).
5. On failure: increment failed count in `validation_attempts` window. If `>= lockout_threshold` → insert `validation_lockouts`. Return `{ success:false, error:{code:"validation_failed", attempts_remaining} }`.
6. On success: evaluate `campaign_bonus_rules` + `bonus_config` → `stamp_value`. Enforce `maxStampsPerDay`.
7. Update `loyalty_accounts.current_progress`. Insert `loyalty_progress_log` with `stamp_value`, `bonus_rule_id`.
8. Determine crossed `campaign_rewards` tiers and `loyalty_programs.threshold`. Return but do **not** mint.

**Response `result` (success):**
```json
{
  "action_type": "visit",
  "stamps_applied": 2,
  "new_progress": 5,
  "threshold": 10,
  "bonus_applied": true,
  "bonus_rule": { "id": "uuid", "name": "Double Stamps Tuesday", "multiplier": 2.0 },
  "cooldown": { "until": "2026-04-24T00:00:00Z", "scope": "member" },
  "unlockable_rewards": [
    { "tier_id": "uuid", "threshold": 5,  "name": "Free drip", "unlocked_now": true  }
  ]
}
```

**Response (failure):**
```json
{
  "success": false,
  "error": {
    "code": "validation_failed",         // | "locked" | "cooldown_active" | "program_inactive"
    "message": "Incorrect PIN",
    "attempts_remaining": 2,
    "next_stamp_available_at": null,
    "locked": false,
    "http_status": 401
  }
}
```

### 2.3 `loyalty_reward_unlocked` (mint)

Two-phase by design: stamping **detects**, this event **mints**. This lets a customer tap "Claim" when ready.

**Request `payload`:**
```jsonc
{
  "tier_id": "uuid|null",                 // null = program.threshold reward
  "source":  "standard",                  // "standard" | "birthday" | "manual_grant"
  "manager_override": {                   // only for manual_grant
    "profile_id": "uuid",
    "pin": "1234"
  }
}
```

**Server logic:**
1. Reload member progress. If progress < tier threshold and source != `manual_grant` → deny.
2. Insert `redemptions` row + `loyalty_redemptions` with `short_code`, `status='valid'`, `expires_at`, `redemption_source`, `reward_tier_id`.
3. Apply reset/rollover to `loyalty_accounts.current_progress`:
   - `reset` → `current_progress = 0`
   - `rollover` → `current_progress = current_progress - tier_threshold`
4. Log `loyalty_progress_log` action `reward_redeemed`.

**Response `result`:**
```json
{
  "short_code": "AB3K9M",
  "redemption_id": "uuid",
  "reward_name": "Free latte",
  "expires_at": "2026-05-23T12:00:00Z",
  "new_progress": 0,
  "qr_payload": "https://hub.example/r/AB3K9M"
}
```

### 2.4 `loyalty_enrollment_requested`

```jsonc
// payload
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "+15551234",
  "birthday": "1990-05-15",              // optional
  "consent": { "marketing": true, "sms": false, "ts": "..." },
  "device_token_request": true
}
// result
{
  "member_code": "A1B2C3D4",
  "loyalty_account_id": "uuid",
  "enrollment_bonus_applied": 1,
  "device_token": "opaque|null"
}
```

### 2.5 `loyalty_manager_unlock`

```jsonc
// payload
{ "manager_pin": "1234", "lockout_id": "uuid" }
// result
{ "unlocked": true, "unlocked_by": "profile_id" }
```

Updates `validation_lockouts.unlocked_at` + `unlocked_by`.

### 2.6 `loyalty_session_heartbeat` (optional)

Spoke pings every 60s while UI is open → Hub returns updated `manifest_version`. If client's cached version is stale, Spoke refetches the manifest.

### 2.7 Error code catalogue (stable contract)

| Code | HTTP | Meaning |
|---|---|---|
| `validation_failed` | 401 | Wrong PIN/icon; `attempts_remaining` included |
| `locked` | 423 | Account in `validation_lockouts` |
| `cooldown_active` | 429 | Too soon; `next_stamp_available_at` included |
| `program_inactive` | 409 | Campaign paused/expired |
| `session_expired` | 401 | Re-call `loyalty_session_started` |
| `idempotent_replay` | 200 | Prior result returned verbatim |
| `rate_limited` | 429 | IP/device throttle |
| `not_enrolled` | 404 | No `loyalty_account` for member_code |
| `reward_not_available` | 409 | Progress < threshold |

---

## 3. Security & Telemetry — Hub Holds All State

### 3.1 Cooldowns (no Spoke DB)

Stored in `loyalty_programs.cool_down_seconds` + `cool_down_scope`. Enforced entirely in the `loyalty_stamp_requested` handler:

```sql
SELECT MAX(created_at) AS last_visit
FROM loyalty_progress_log
WHERE loyalty_account_id = $1
  AND action_type = 'visit_confirmed'
  AND (
    $scope = 'member'
    OR (device_info->>'device_token') = $device_token
  )
LIMIT 1;
```

If `NOW() - last_visit < cool_down_seconds` → return `cooldown_active` + `next_stamp_available_at`. The Spoke renders the countdown from that timestamp; no local clock trust.

### 3.2 Failed attempts & lockout

Already partially supported — this PRD tightens it:

1. **Sliding window counter.** On each validation attempt insert `validation_attempts(success, created_at)`. Count failures in the last `attempt_window_seconds`.
2. **Lockout.** When count ≥ `loyalty_programs.lockout_threshold`, insert one `validation_lockouts` row. `unlocked_at` NULL = active.
3. **Auto-unlock** (new). If `lockout_duration_seconds > 0` and `NOW() - locked_at > lockout_duration_seconds`, the Hub treats it unlocked and sets `unlocked_at = NOW()`, `unlocked_by = NULL` (system). If 0, manager override is required.
4. **Manager override.** `loyalty_manager_unlock` event writes `unlocked_at`, `unlocked_by`. Manager PIN checked against `clients.unlock_pin` (existing).

### 3.3 Idempotency

`request_id` / `X-Hub-Idempotency-Key` stored in a new lightweight table:

```sql
CREATE TABLE IF NOT EXISTS hub_idempotency (
  request_id uuid PRIMARY KEY,
  scope text NOT NULL,                    -- event name
  response_body jsonb NOT NULL,
  status integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hub_idempotency_created_at ON hub_idempotency(created_at);
ALTER TABLE hub_idempotency ENABLE ROW LEVEL SECURITY;
-- no client policies: service role only
```

Retention: nightly cleanup of rows older than 24h.

### 3.4 Session tokens

Stateless JWT signed with `HUB_SPOKE_SIGNING_KEY` (Edge Function secret). Claims: `sub=member_code`, `cid=campaign_id`, `scope`, `iat`, `exp (15m)`, `mv=manifest_version`. Rotated on every `loyalty_session_started`. The Spoke never persists.

### 3.5 Device-scoped rate limiting

Independent of cooldown. Per `(device.id, campaign_id)`:
- 10 stamp attempts / minute
- 30 total events / minute

Implemented via a `hub_rate_limit` table keyed on `(scope, key, window_start)` or Postgres `pg_advisory_lock` + counter; 429 `rate_limited` on breach.

### 3.6 Telemetry tables (Hub-authoritative)

Already in place and sufficient; only additions are:

- **`loyalty_progress_log`** — add `request_id uuid` column for cross-reference to idempotency.
- **`validation_attempts`** — add `method text`, `failure_reason text` for richer analytics.
- **New `hub_spoke_events`** — optional raw event ingest (firehose for replay / debugging):

```sql
CREATE TABLE IF NOT EXISTS hub_spoke_events (
  id bigserial PRIMARY KEY,
  event text NOT NULL,
  campaign_id uuid,
  member_code text,
  request_id uuid,
  payload jsonb NOT NULL,
  response jsonb,
  http_status integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON hub_spoke_events (campaign_id, created_at DESC);
CREATE INDEX ON hub_spoke_events (request_id);
ALTER TABLE hub_spoke_events ENABLE ROW LEVEL SECURITY;
-- SELECT policy: admins on matching campaign; no insert from clients.
```

### 3.7 RLS posture

- All new tables (`hub_idempotency`, `hub_spoke_events`, rate-limit table) are **service-role only**. The Spoke never holds a Supabase anon key for these; it only talks to Edge Functions.
- `loyalty_programs.validation_config` must not be exposed to `authenticated` in any existing SELECT policy — audit and tighten if needed (currently admin/staff only).

---

## 4. Edge Function surface to build

| Function | Path | Purpose |
|---|---|---|
| `loyalty-manifest` | `GET /functions/v1/loyalty-manifest` | §1.3 manifest fetch |
| `loyalty-session` | `POST /functions/v1/loyalty-session` | §2.1 start/refresh session |
| `loyalty-event` | `POST /functions/v1/loyalty-event` | Dispatcher for §2.2–2.6 by `event` field |

`loyalty-event` replaces/supersedes `confirm-loyalty-action`. The existing `confirm-loyalty-action` and `redeem-birthday-reward` remain operational during cutover behind a feature flag (`HUB_LOYALTY_V2`), then become thin adapters that call the new handler.

---

## 5. Migration plan (phased, non-destructive)

1. **Phase 1 — Schema.** Add columns in §1.2.1, create `hub_idempotency`, `hub_spoke_events`. No data moves.
2. **Phase 2 — PIN hashing backfill.** For each `loyalty_programs` where `validation_method='pin'`, hash `validation_config->>'pinValue'` into `pinHash`/`pinSalt`; keep plaintext for one release behind a feature flag; remove in Phase 5.
3. **Phase 3 — Edge functions.** Ship `loyalty-manifest`, `loyalty-session`, `loyalty-event`.
4. **Phase 4 — Spoke integration.** Spoke consumes manifest + events behind `HUB_LOYALTY_V2`.
5. **Phase 5 — Deprecate legacy.** Remove plaintext PIN field, retire direct `confirm-loyalty-action` callers.

No existing rows are lost. All changes are `ADD COLUMN`, `CREATE TABLE`, or additive JSONB keys.

---

## 6. Open questions for the Spoke team

1. Does the Spoke ever need an **offline-capable** render? If yes, we must ship a signed manifest with a short validity window.
2. Confirm the **device token** model: remember-me across sessions on a kiosk vs. per-customer.
3. Should `action_type='action'` support multi-item batches in one event (`quantity>1`) or always one-per-call? (Recommend: allow up to `maxStampsPerDay`.)
4. Multi-tier claim UX: do we allow claiming a lower tier (bronze 5) and keeping progress toward silver 10, or is claiming any tier a reset/rollover event? The proposed contract supports both via `reset_behavior`.
