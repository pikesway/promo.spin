# Product Requirements Document: Loyalty Card Program (Spoke Application)

**Document Version:** 1.0
**Date:** 2026-04-22
**Status:** Ready for Development
**Prepared by:** Lead System Analyst
**Audience:** Developer building this from scratch (vibe coding welcome)

---

## Table of Contents

1. [What This App Is](#1-what-this-app-is)
2. [How It Fits Into the Larger System](#2-how-it-fits-into-the-larger-system)
3. [User Roles](#3-user-roles)
4. [The Complete Database Schema](#4-the-complete-database-schema)
5. [Enrollment Flow](#5-enrollment-flow)
6. [The Loyalty Card Screen](#6-the-loyalty-card-screen)
7. [Visit Confirmation Flow](#7-visit-confirmation-flow)
8. [Staff Validation Methods](#8-staff-validation-methods)
9. [Account Lockout and Manager Override](#9-account-lockout-and-manager-override)
10. [Reward Catalog and Multi-Tier Rewards](#10-reward-catalog-and-multi-tier-rewards)
11. [Bonus Stamp Rules](#11-bonus-stamp-rules)
12. [Birthday Rewards](#12-birthday-rewards)
13. [Reward Redemption Flow](#13-reward-redemption-flow)
14. [The Admin Builder](#14-the-admin-builder)
15. [Member Management](#15-member-management)
16. [Full Config JSON Structure](#16-full-config-json-structure)
17. [Icon System](#17-icon-system)
18. [Edge Functions — Full Logic](#18-edge-functions--full-logic)
19. [Public Routes Summary](#19-public-routes-summary)
20. [Branding and Theming](#20-branding-and-theming)
21. [Integration with the Reward Hub](#21-integration-with-the-reward-hub)
22. [What This App Does NOT Own](#22-what-this-app-does-not-own)

---

## 1. What This App Is

This is a **digital stamp card loyalty program**. Think of it as the mobile-friendly replacement for paper punch cards.

A business signs up, creates a loyalty program, and gets a QR code / enrollment link to share with customers. Customers scan the QR code, fill in their name and email, and get a digital loyalty card. Every time they visit, a staff member enters a secret PIN (or taps an icon) to add a stamp. When the customer collects enough stamps (e.g., 10), they earn a reward (e.g., "Free Coffee"). They redeem the reward at the counter, and the cycle resets.

**Key characteristics:**

- This is a **spoke application** in a hub-and-spoke system. It manages all the stamp-collection logic, but when a reward is earned, it calls an external **Reward Hub** API to generate the redemption code.
- It is a mobile-first, consumer-facing app. The primary user interface is designed to be used on a phone.
- It supports **multiple programs per client** (one per campaign).
- Each program is scoped to a **brand** within a **client** — the multi-tenant hierarchy is `Platform > Client > Brand > Campaign > Member`.

---

## 2. How It Fits Into the Larger System

```
┌─────────────────────────────────────────────────────┐
│                   REWARD HUB                        │
│  (separate application — manages redemption codes)   │
│                                                     │
│   POST /api/v1/redemptions/issue    ◄───────────────┼──────┐
│   Returns: shortCode, token, url                    │      │
└─────────────────────────────────────────────────────┘      │
                                                             │ calls hub API
                                                             │ when reward earned
┌────────────────────────────────────────────────────────────▼──┐
│                  LOYALTY CARD APP (this app)                   │
│                                                                │
│  /loyalty/:campaignSlug          → Enrollment page            │
│  /loyalty/:campaignSlug/:code    → Member's card              │
│  Admin dashboard                 → Program builder            │
│  Admin dashboard                 → Member management          │
└────────────────────────────────────────────────────────────────┘
```

**What the loyalty app owns:**
- Enrollment (collecting name, email, phone, birthday)
- Stamp tracking (current_progress, total_visits)
- Visit validation (PIN / icon verification by staff)
- Bonus rules (double stamps on Tuesdays, etc.)
- Birthday reward eligibility check
- Lockout and manager override
- Admin builder for program configuration
- Member management and reporting

**What the loyalty app does NOT own:**
- Redemption codes and their lifecycle
- The page where a cashier marks a reward as claimed
- Email notifications for redemptions

When a member earns a reward, this app calls the Reward Hub's API. The hub returns a `shortCode` and `redemptionToken`. This app navigates the member to `/redeem/{shortCode}?token={redemptionToken}` which lives on the Reward Hub.

---

## 3. User Roles

| Role | Description | Access |
|------|-------------|--------|
| **Platform Admin** | Runs the SaaS. Can manage all clients. | Everything |
| **Client Admin** | Owns the business account. Configures programs. | All brands under their client |
| **Brand Manager** | Manages one brand's programs. | Assigned brand only |
| **Staff** | Works the counter. Validates visits. | Validation UI only — no config |
| **Member (end user)** | Customer. Uses a phone. No login. | Their own loyalty card (by member code) |

**Important:** Members do not have accounts in Supabase Auth. They are identified entirely by their `member_code` (8-character code in the URL). The device token mechanism provides a shortcut to skip re-enrollment on the same device.

---

## 4. The Complete Database Schema

Build these tables with Supabase migrations.

### 4.1 `clients`

```sql
CREATE TABLE IF NOT EXISTS clients (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  slug            text UNIQUE NOT NULL,
  primary_color   text DEFAULT '#F59E0B',
  background_color text DEFAULT '#18181B',
  logo_url        text,
  unlock_pin      text,           -- manager override PIN (4-6 digits)
  is_active       boolean DEFAULT true,
  settings        jsonb DEFAULT '{}',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
```

**`unlock_pin`** — This is the manager's master PIN used to unlock a locked member card. Stored here per-client. Staff cannot see or change it.

---

### 4.2 `brands`

```sql
CREATE TABLE IF NOT EXISTS brands (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name            text NOT NULL,
  slug            text NOT NULL,
  logo_url        text,
  primary_color   text DEFAULT '#F59E0B',
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  UNIQUE(client_id, slug)
);
```

---

### 4.3 `profiles`

```sql
CREATE TABLE IF NOT EXISTS profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id       uuid REFERENCES clients(id),
  full_name       text,
  role            text NOT NULL DEFAULT 'staff'
                  CHECK (role IN ('platform_admin', 'client_admin', 'brand_manager', 'staff')),
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
```

---

### 4.4 `campaigns`

```sql
CREATE TABLE IF NOT EXISTS campaigns (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  brand_id        uuid REFERENCES brands(id),
  name            text NOT NULL,
  slug            text NOT NULL UNIQUE,
  type            text NOT NULL DEFAULT 'loyalty'
                  CHECK (type IN ('loyalty', 'spin', 'scratch', 'trivia')),
  status          text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  config          jsonb NOT NULL DEFAULT '{}',
  analytics       jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
```

**`config`** — This is where the entire loyalty program configuration lives. See [Section 16](#16-full-config-json-structure) for the full structure.

**`slug`** — Used in all public URLs. Example: `coffee-rewards`. The enrollment URL is `/loyalty/coffee-rewards`.

---

### 4.5 `loyalty_programs`

```sql
CREATE TABLE IF NOT EXISTS loyalty_programs (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id                 uuid NOT NULL UNIQUE REFERENCES campaigns(id) ON DELETE CASCADE,
  program_type                text NOT NULL DEFAULT 'visit'
                              CHECK (program_type IN ('visit', 'action')),
  threshold                   integer NOT NULL DEFAULT 10
                              CHECK (threshold BETWEEN 1 AND 100),
  validation_method           text NOT NULL DEFAULT 'pin'
                              CHECK (validation_method IN ('pin', 'icon_single', 'icon_sequence')),
  validation_config           jsonb NOT NULL DEFAULT '{}',
  reward_name                 text NOT NULL DEFAULT 'Free Reward',
  reward_description          text,
  reset_behavior              text NOT NULL DEFAULT 'reset'
                              CHECK (reset_behavior IN ('reset', 'rollover')),
  lockout_threshold           integer NOT NULL DEFAULT 3
                              CHECK (lockout_threshold BETWEEN 1 AND 10),
  birthday_reward_enabled     boolean NOT NULL DEFAULT false,
  birthday_reward_name        text,
  birthday_reward_description text,
  created_at                  timestamptz DEFAULT now(),
  updated_at                  timestamptz DEFAULT now()
);
```

**This table stores the authoritative program settings.** The `campaigns.config` JSONB column also contains these values (for historical reasons / convenience), but `loyalty_programs` is the source of truth for the edge functions.

---

### 4.6 `leads`

```sql
CREATE TABLE IF NOT EXISTS leads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid NOT NULL REFERENCES clients(id),
  brand_id        uuid REFERENCES brands(id),
  name            text NOT NULL,
  email           text NOT NULL,
  phone           text,
  birthday        date,           -- stored as 2000-MM-DD; only month+day matter
  source_type     text DEFAULT 'loyalty'
                  CHECK (source_type IN ('loyalty', 'game', 'manual', 'import')),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(brand_id, email)         -- one canonical lead per email per brand
);
```

**The `leads` table is the canonical identity store.** A person is identified by their email address within a brand. If they enroll in two different loyalty programs for the same brand, they share one `leads` row and get two separate `loyalty_accounts` rows.

**Birthday format:** Store as `2000-MM-DD`. The year `2000` is arbitrary — only the month and day are ever compared.

---

### 4.7 `loyalty_accounts`

```sql
CREATE TABLE IF NOT EXISTS loyalty_accounts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id         uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  client_id           uuid NOT NULL REFERENCES clients(id),
  brand_id            uuid REFERENCES brands(id),
  lead_id             uuid NOT NULL REFERENCES leads(id),
  member_code         text NOT NULL UNIQUE,   -- 8-char, e.g. "AB3K7MNP"
  current_progress    integer NOT NULL DEFAULT 0,
  total_visits        integer NOT NULL DEFAULT 0,
  reward_unlocked     boolean NOT NULL DEFAULT false,
  reward_unlocked_at  timestamptz,
  enrolled_at         timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),
  UNIQUE(campaign_id, lead_id)    -- one account per person per campaign
);
```

**`member_code`** — 8 characters from the unambiguous set `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (excludes `0`, `O`, `1`, `I`). Used as the URL path segment and the primary way members are identified on their card.

**`current_progress`** — Number of stamps currently on the card. This value is modified by the `confirm-loyalty-action` edge function only — never directly from the frontend.

**`reward_unlocked`** — Set to `true` when progress crosses a reward tier threshold. Reset to `false` after redemption.

---

### 4.8 `loyalty_progress_log`

```sql
CREATE TABLE IF NOT EXISTS loyalty_progress_log (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loyalty_account_id    uuid NOT NULL REFERENCES loyalty_accounts(id) ON DELETE CASCADE,
  campaign_id           uuid NOT NULL REFERENCES campaigns(id),
  action_type           text NOT NULL
                        CHECK (action_type IN ('visit_confirmed', 'reward_unlocked', 'reward_redeemed', 'progress_reset')),
  quantity              integer NOT NULL DEFAULT 1,
  stamp_value           integer NOT NULL DEFAULT 1,  -- may differ from quantity if bonus applied
  bonus_rule_id         uuid REFERENCES campaign_bonus_rules(id),
  validated_by          uuid REFERENCES profiles(id),
  device_info           jsonb DEFAULT '{}',
  created_at            timestamptz DEFAULT now()
);
```

**This is an immutable append-only log.** Never update or delete rows here. Every stamp addition, reward unlock, and redemption writes a row.

**`stamp_value`** — The actual number of stamps added. Normally `1`, but could be `2` if a bonus rule with `multiplier = 2` was active.

---

### 4.9 `campaign_rewards` (Reward Tiers)

```sql
CREATE TABLE IF NOT EXISTS campaign_rewards (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id         uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  reward_name         text NOT NULL,
  threshold           integer NOT NULL,       -- stamps required for this tier
  reward_description  text,
  reward_type         text NOT NULL DEFAULT 'custom'
                      CHECK (reward_type IN ('free_item', 'discount', 'vip', 'custom')),
  reward_value        text,                   -- e.g. "10%" or "$5"
  active              boolean NOT NULL DEFAULT true,
  sort_order          integer NOT NULL DEFAULT 0,
  created_at          timestamptz DEFAULT now()
);
```

**When tiers exist**, the `loyalty_programs.threshold` field becomes less relevant. The system watches `campaign_rewards` rows for threshold crossings. When progress moves from `oldProgress` to `newProgress`, any tier where `oldProgress < tier.threshold <= newProgress` is considered "crossed" and the reward is unlocked.

---

### 4.10 `campaign_bonus_rules`

```sql
CREATE TABLE IF NOT EXISTS campaign_bonus_rules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name            text NOT NULL,
  rule_type       text NOT NULL
                  CHECK (rule_type IN ('day_of_week', 'time_window', 'custom_simple')),
  day_of_week     integer CHECK (day_of_week BETWEEN 0 AND 6),  -- 0=Sun, 6=Sat
  start_time      time,
  end_time        time,
  multiplier      numeric(4,2) NOT NULL DEFAULT 1.0,
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz DEFAULT now()
);
```

---

### 4.11 `loyalty_redemptions`

```sql
CREATE TABLE IF NOT EXISTS loyalty_redemptions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loyalty_account_id  uuid NOT NULL REFERENCES loyalty_accounts(id) ON DELETE CASCADE,
  campaign_id         uuid NOT NULL REFERENCES campaigns(id),
  redemption_id       uuid,             -- FK to hub's redemptions table (nullable until hub available)
  short_code          text NOT NULL,    -- 6-char code matching hub record
  status              text NOT NULL DEFAULT 'valid'
                      CHECK (status IN ('valid', 'redeemed', 'expired')),
  redemption_source   text NOT NULL DEFAULT 'standard'
                      CHECK (redemption_source IN ('standard', 'birthday')),
  reward_tier_id      uuid REFERENCES campaign_rewards(id),
  expires_at          timestamptz,
  redeemed_at         timestamptz,
  redeemed_by         uuid REFERENCES profiles(id),
  created_at          timestamptz DEFAULT now()
);
```

**This table tracks loyalty-specific redemptions.** The `short_code` links to the Reward Hub. The `redemption_source` field distinguishes between a standard earned reward and a birthday reward.

---

### 4.12 `validation_lockouts`

```sql
CREATE TABLE IF NOT EXISTS validation_lockouts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loyalty_account_id  uuid NOT NULL REFERENCES loyalty_accounts(id) ON DELETE CASCADE,
  campaign_id         uuid NOT NULL REFERENCES campaigns(id),
  reason              text DEFAULT 'Too many failed validation attempts',
  locked_at           timestamptz DEFAULT now(),
  unlocked_at         timestamptz,           -- NULL while locked
  unlocked_by         uuid REFERENCES profiles(id)
);
```

**A record with `unlocked_at = NULL` means the account is currently locked.** There should only be one active lockout per account at a time. The edge function checks for a lockout on every action.

---

### 4.13 `loyalty_device_tokens`

```sql
CREATE TABLE IF NOT EXISTS loyalty_device_tokens (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loyalty_account_id  uuid NOT NULL REFERENCES loyalty_accounts(id) ON DELETE CASCADE,
  campaign_id         uuid NOT NULL REFERENCES campaigns(id),
  device_token        text NOT NULL UNIQUE,  -- UUID stored in localStorage
  device_name         text,                  -- 'iPhone', 'Android', etc.
  expires_at          timestamptz NOT NULL,  -- 60 days from creation
  created_at          timestamptz DEFAULT now(),
  last_used_at        timestamptz
);
```

**How device tokens work:**
1. During enrollment, if the user checks "Remember this device," a UUID is generated.
2. The UUID is stored in the database (`loyalty_device_tokens`) and also in `localStorage` with key `loyalty_device_{campaignSlug}`.
3. The next time the user visits the enrollment URL, the app checks localStorage first. If a valid (non-expired) token is found in the database, the user is redirected straight to their card — no re-enrollment needed.
4. Token expiry: 60 days. After expiry, the user re-enrolls.

---

## 5. Enrollment Flow

**URL:** `/loyalty/:campaignSlug`

**Step 1 — Device Token Check (happens before anything is rendered)**

```javascript
const tokenKey = `loyalty_device_${campaignSlug}`;
const storedToken = localStorage.getItem(tokenKey);

if (storedToken) {
  // Query DB: loyalty_device_tokens where device_token = storedToken AND expires_at > now()
  if (found and valid) {
    // Update last_used_at
    // Redirect to /loyalty/{campaignSlug}/{member_code}
    return; // skip enrollment entirely
  } else {
    localStorage.removeItem(tokenKey); // clean up stale token
  }
}
```

**Step 2 — Load Campaign**

Query `campaigns` by `slug` and `type = 'loyalty'`. Also fetch the client and `loyalty_programs` record.

If `status !== 'active'`: show a "Program not accepting enrollments" message.
If `status === 'paused'`: show a "Program temporarily paused" message with the brand's logo and colors.

**Step 3 — Enrollment Form**

Display form with these fields:

| Field | Required | Notes |
|-------|----------|-------|
| Name | Yes | Free text |
| Email | Yes | Validated with regex; normalized to lowercase on submit |
| Phone | No | Stored as-is |
| Birthday Month | No | Only shown if `loyalty_programs.birthday_reward_enabled = true` |
| Birthday Day | No | Only shown if birthday reward enabled |
| "I agree to receive rewards updates" | Yes | Checkbox; must be checked to submit |
| "Remember this device" | No | Checkbox; default checked; controls device token creation |

**Step 4 — Submit Logic**

```javascript
// 1. Normalize email to lowercase
// 2. Build birthday value: if both month and day provided:
//    birthday = `2000-${month.padStart(2,'0')}-${day.padStart(2,'0')}`
//    e.g. March 15 → "2000-03-15"

// 3. Find or create lead:
const existingLead = await supabase
  .from('leads')
  .select('id')
  .eq('brand_id', campaign.brand_id)
  .eq('email', normalizedEmail)
  .maybeSingle();

if (existingLead) {
  leadId = existingLead.id;
  // If birthday was provided and lead doesn't have one, backfill it
} else {
  // INSERT into leads: { client_id, brand_id, name, email, phone, birthday, source_type: 'loyalty' }
  leadId = newLead.id;
}

// 4. Check if already enrolled in this specific campaign:
const existing = await supabase
  .from('loyalty_accounts')
  .select('id, member_code')
  .eq('campaign_id', campaign.id)
  .eq('lead_id', leadId)
  .maybeSingle();

if (existing) {
  // Don't create a new account — just create a device token if needed and redirect
  navigate(`/loyalty/${campaignSlug}/${existing.member_code}`);
  return;
}

// 5. Generate member_code: 8 random chars from "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
// 6. INSERT loyalty_accounts: { campaign_id, client_id, brand_id, lead_id, member_code,
//    current_progress: 0, total_visits: 0, reward_unlocked: false }
// 7. If rememberDevice: create device token (60-day UUID in DB + localStorage)
// 8. navigate(`/loyalty/${campaignSlug}/${memberCode}`)
```

**Error handling:**
- `23505` (unique constraint): "This email is already enrolled" — though this should be caught by the re-enrollment check above.

---

## 6. The Loyalty Card Screen

**URL:** `/loyalty/:campaignSlug/:memberCode`

This is the member's digital card. It is a public page — no authentication required. All data is loaded using the `memberCode` URL parameter.

**Data loaded on mount:**

```javascript
// 1. Fetch campaign (by slug and type='loyalty') + client
// 2. Fetch loyalty_programs by campaign_id
// 3. Fetch campaign_rewards (active only, ordered by threshold ascending)
// 4. Fetch loyalty_accounts where member_code = memberCode AND campaign_id = campaign.id
//    Join: leads(name, email, birthday)
// 5. Check birthday eligibility (see Section 12)
// 6. Update loyalty_device_tokens.last_used_at (fire and forget, no await)
// 7. Check validation_lockouts for active lockout
```

**Visual layout of the card:**

```
┌──────────────────────────────────┐
│  [Client Logo]                   │
│  Business Name                   │
│  Next Reward Name                │
├──────────────────────────────────┤
│  ●●●●●○○○○○  (stamp grid)       │
│  5 more for Free Coffee          │
├──────────────────────────────────┤
│  [QR Code]   Member ID: AB3K7MNP │
│              John Smith          │
└──────────────────────────────────┘

[Confirm Visit] or [Redeem Your Reward]
[Refresh Card]
```

**Stamp grid rules:**
- Grid is always `grid-cols-5` (5 columns)
- Total cells = `displayThreshold` (the next tier's threshold, or `loyaltyProgram.threshold` if no tiers)
- Filled cells: index `< currentProgress` — show with `stampFilledColor` background + icon
- Empty cells: border with `stampEmptyColor`
- On successful stamp addition: the newly-added stamp plays a `scale-125` animation for 1.5 seconds

**Stamp icon options:**
- A named icon from the icon library (e.g., `star`, `coffee`, `heart`) — see [Section 17](#17-icon-system)
- OR a custom image URL (when `stampIcon === 'custom'` and `customIconUrl` is set)

**Tier progress display:**
- If `campaign_rewards` has active tiers: find the first tier where `threshold > currentProgress`. That is the `nextTier`.
- Display: `"{N} more for {nextTier.reward_name}"`
- If all tiers unlocked (or no tiers): show "Reward Ready!"

**Collapsible tier list:**
- If more than one active tier exists, show a collapsible "Reward Tiers" panel below the card
- Each tier row shows: earned checkmark (if `currentProgress >= tier.threshold`), tier name, stamp count badge

**Buttons:**
- If `reward_unlocked = true` OR any tier threshold crossed: show "Redeem Your Reward" button
- If not unlocked and program not paused: show "Confirm Visit" (or "Confirm Purchase" if `programType === 'action'`)
- Always show "Refresh Card" button

**Paused program:**
- If `campaign.status === 'paused'`: show yellow warning banner "Program Temporarily Paused"
- Hide "Confirm Visit" button but KEEP "Redeem Your Reward" if already earned

**Birthday banner:**
- If member is birthday-eligible: show a gradient pink-orange banner at the TOP of the page
- "Happy Birthday! Claim your {birthday_reward_name}" with "Claim Birthday Reward" button
- This banner is independent of the regular stamp card

---

## 7. Visit Confirmation Flow

**Triggered by:** "Confirm Visit" button tap

**Step 1 — Check lockout**

```javascript
if (isLocked) {
  setShowManagerOverride(true);
  return;
}
```

**Step 2 — Open StaffValidationModal**

The modal requires staff to enter the configured validation (PIN or icon). It handles its own failure counting. See [Section 8](#8-staff-validation-methods).

**Step 3 — On validation success, call edge function**

```javascript
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/confirm-loyalty-action`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      memberCode: account.member_code,
      campaignId: campaign.id,
      actionType: 'visit',
      deviceInfo: { userAgent: navigator.userAgent, timestamp: Date.now() },
      bypassCoolDown: bypassCoolDown,   // true if staff tapped "Override"
    }),
  }
);
```

**Step 4 — Handle response**

| HTTP Status | `result.coolDown` | Action |
|-------------|------------------|--------|
| 200 | — | Play success animation (1.5s scale animation on new stamp). Re-fetch data. |
| 429 | `true` | Show yellow cool-down warning with time remaining. Show "Staff Override — Confirm Anyway" button. |
| 403 | — | Show error (account locked or program paused) |
| 500 | — | Show generic error |

**Cool-down override:**
When the cool-down banner shows, there is a "Staff Override — Confirm Anyway" button. Tapping it calls `handleConfirmAction('visit', true)`, which sets `bypassCoolDown: true` in the next edge function call.

---

## 8. Staff Validation Methods

The `StaffValidationModal` is a full-screen overlay (`z-50`). It displays one of three validation UIs based on `validationMethod`. It tracks failed attempts and creates a lockout record when the threshold is exceeded.

**Props passed to the modal:**

```javascript
<StaffValidationModal
  isOpen={showValidation}
  onClose={() => setShowValidation(false)}
  onSuccess={actionType === 'redemption' ? handleRedemptionSuccess : handleValidationSuccess}
  validationMethod={validationMethod}    // 'pin' | 'icon_single' | 'icon_sequence'
  validationConfig={validationConfig}    // object with method-specific keys
  actionType={actionType}                // 'visit' | 'redemption'
  lockoutThreshold={loyaltyConfig.lockoutThreshold || 3}
  isLocked={isLocked}
  onUnlockRequest={handleUnlockRequest}
  onLockout={() => setIsLocked(true)}
  accountId={account.id}
  campaignId={campaign.id}
/>
```

**Failure handling (inside StaffValidationModal):**

```javascript
const handleFailure = async () => {
  const newFailedAttempts = failedAttempts + 1;
  setFailedAttempts(newFailedAttempts);

  if (newFailedAttempts >= lockoutThreshold) {
    setShowLockout(true);
    // INSERT into validation_lockouts: { loyalty_account_id, campaign_id, reason }
    onLockout(); // tells parent to set isLocked = true
  }
};
```

**Failed attempts counter resets each time the modal is opened.**

---

### 8.1 PIN Validation

**Config structure:**
```javascript
validationConfig = {
  pinValue: "1234",      // The correct PIN (4-6 chars)
  pinLength: 4,          // How many digits (default 4)
  pinType: "numeric"     // "numeric" or "alphanumeric"
}
```

**UI:**
- Row of `pinLength` empty boxes (show `*` for each entered digit)
- Keypad below:
  - Numeric: 3x4 grid (`1-9`, blank, `0`, blank)
  - Alphanumeric: 6x4 grid (`1-9`, `A-M` on top rows; limited set)
- Delete button and Submit button
- Submit is disabled until `pin.length === maxLength`

**Validation logic:**
```javascript
if (pin.toUpperCase() === correctPin.toUpperCase()) {
  onSuccess();
} else {
  // shake animation, clear pin, show error, call onFailure()
}
```

**Important:** Comparison is case-insensitive (`.toUpperCase()`).

---

### 8.2 Icon Single Validation (icon_single)

**Config structure:**
```javascript
validationConfig = {
  targetIcon: "heart"    // ID of the icon staff must select
}
```

**UI:**
- 4x4 grid of 16 randomly shuffled icons
- The `targetIcon` is always included somewhere in the grid
- Staff must tap the correct icon
- Grid reshuffles on each modal open (`useMemo` with `isOpen` dependency)

**Validation logic:**
```javascript
if (icon.id === targetIconId) {
  onSuccess(); // after 200ms delay
} else {
  // shake animation, error message, call onFailure()
}
```

**The grid always contains the target icon.** If random shuffle didn't include it, it replaces a random position.

---

### 8.3 Icon Sequence Validation (icon_sequence)

**Config structure:**
```javascript
validationConfig = {
  iconSequence: ["heart", "star", "coffee"]  // 2-5 icons in order
  // Also accepted as: sequence: [...]
}
```

**UI:**
- 4x4 grid of 16 randomly shuffled icons (all target icons always included)
- A "selection tray" above the grid shows icons tapped so far
- Selected icons get a numbered badge (`1`, `2`, `3`...)
- Staff must tap icons in exact order
- A clear (X) button lets staff reset their selection

**Validation logic:**
```javascript
// Triggered when selectedSequence.length === sequenceLength
const isCorrect = newSequence.every((id, index) => id === targetSequence[index]);
if (isCorrect) {
  onSuccess(); // after 300ms delay
} else {
  // shake animation, reset sequence, call onFailure()
}
```

**Sequence validation only fires when all required icons have been tapped** — not on each individual tap.

---

## 9. Account Lockout and Manager Override

**Lockout trigger:** When `failedAttempts >= lockoutThreshold` inside the `StaffValidationModal`.

**Effect:** A row is inserted into `validation_lockouts`:
```javascript
{
  loyalty_account_id: accountId,
  campaign_id: campaignId,
  reason: 'Too many failed validation attempts'
  // locked_at defaults to now()
  // unlocked_at defaults to NULL
}
```

The card page checks for an active lockout on load:
```javascript
const { data: lockoutData } = await supabase
  .from('validation_lockouts')
  .select('*')
  .eq('loyalty_account_id', accountData.id)
  .is('unlocked_at', null)
  .maybeSingle();
setIsLocked(!!lockoutData);
```

**When locked:**
- The card shows a red warning: "This card is temporarily locked. Please ask staff for assistance."
- Tapping any action button shows the `ManagerOverrideModal` instead of `StaffValidationModal`

**Manager Override Modal:**

```
┌─────────────────────────────────┐
│ [Shield Icon]  Manager Override  │
│                                 │
│  Enter unlock PIN to unlock      │
│  {memberName}'s account          │
│                                 │
│  [Password input for PIN]        │
│                                 │
│  [Cancel]  [Unlock]              │
└─────────────────────────────────┘
```

The modal receives `unlockPin` from `client.unlock_pin`. It does a direct string comparison:
```javascript
if (pin !== unlockPin) {
  setError('Incorrect PIN');
  return;
}
// On success:
await onUnlock(pin);
```

The parent's `onUnlock` handler:
```javascript
const handleManagerUnlock = async (managerPin) => {
  // Find the active lockout record
  const { data: lockout } = await supabase
    .from('validation_lockouts')
    .select('*')
    .eq('loyalty_account_id', account.id)
    .is('unlocked_at', null)
    .maybeSingle();

  if (lockout) {
    await supabase
      .from('validation_lockouts')
      .update({ unlocked_at: new Date().toISOString() })
      .eq('id', lockout.id);
  }

  setIsLocked(false);
  setShowManagerOverride(false);
};
```

**The unlock PIN is fetched from `client.unlock_pin`.** It must be between 4-6 digits. If it's not configured, the modal shows "Unlock PIN Not Configured" and the unlock button is hidden.

**Security note:** The manager override modal has unlimited attempts — no counter, no secondary lockout. The security comes from the PIN only being known to the manager/admin.

---

## 10. Reward Catalog and Multi-Tier Rewards

A loyalty program can have multiple reward tiers at different stamp thresholds.

**Example:**
- 5 stamps → Free Small Coffee
- 10 stamps → Free Medium Coffee + Pastry
- 20 stamps → Free Anything on the Menu

**How tier crossing is detected** (inside `confirm-loyalty-action` edge function):

```javascript
const oldProgress = account.current_progress;
const newProgress = oldProgress + stampValue;

// Fetch all active campaign_rewards for this campaign, sorted by threshold
const allRewards = await supabase
  .from('campaign_rewards')
  .select('*')
  .eq('campaign_id', campaignId)
  .eq('active', true)
  .order('threshold', { ascending: true });

// A tier is "crossed" if: old progress was below its threshold AND new progress meets/exceeds it
const crossedTiers = allRewards.filter(
  r => oldProgress < r.threshold && newProgress >= r.threshold
);

const anyRewardUnlocked = crossedTiers.length > 0 || newProgress >= threshold;
```

**If `campaign_rewards` is empty**, the system falls back to `loyalty_programs.threshold`.

**Tier display on the card:**
- `nextTier` = first active tier where `threshold > currentProgress`
- `unlockedTiers` = all active tiers where `threshold <= currentProgress`
- `rewardUnlocked` = `account.reward_unlocked || unlockedTiers.length > 0`
- `stampsUntilNext` = `nextTier ? nextTier.threshold - currentProgress : threshold - currentProgress`
- `displayThreshold` = `nextTier ? nextTier.threshold : threshold` — this is the number of cells in the stamp grid

---

## 11. Bonus Stamp Rules

Bonus rules multiply the number of stamps added on each visit. The multiplier is evaluated at the moment of the visit confirmation.

**Three rule types:**

### `day_of_week`
Applies for an entire day of the week.
```javascript
// Config: { rule_type: 'day_of_week', day_of_week: 2, multiplier: 2 }
// day_of_week: 0=Sunday, 1=Monday, 2=Tuesday, ..., 6=Saturday
matches = rule.day_of_week === nowUtc.getUTCDay()
```

### `time_window`
Applies during a specific time range, optionally on a specific day.
```javascript
// Config: { rule_type: 'time_window', day_of_week: null, start_time: '16:00', end_time: '18:00', multiplier: 3 }
// If day_of_week is null, matches any day
// Supports overnight windows (e.g., 22:00 - 02:00)
const start = timeToMinutes(rule.start_time);  // hours*60 + minutes
const end = timeToMinutes(rule.end_time);
const currentMinutes = nowUtc.getUTCHours() * 60 + nowUtc.getUTCMinutes();

if (start <= end) {
  matches = currentMinutes >= start && currentMinutes < end;
} else {
  // Overnight window
  matches = currentMinutes >= start || currentMinutes < end;
}
```

### `custom_simple`
Always active. Use for global permanent multipliers.
```javascript
matches = true;
```

**Selection algorithm:**
```javascript
// Evaluate ALL active rules
// If multiple rules match, use the HIGHEST multiplier
let bestMultiplier = 1;
for (const rule of rules) {
  if (matches && rule.multiplier > bestMultiplier) {
    bestMultiplier = rule.multiplier;
  }
}
```

**Stamp calculation:**
```javascript
const stampValue = Math.floor(1 * multiplier + 0.5);  // roundHalfUp
// multiplier = 1: stampValue = 1
// multiplier = 2: stampValue = 2
// multiplier = 1.5: stampValue = 2 (rounds up)
// multiplier = 2.5: stampValue = 3
```

**Important:** All time comparisons use UTC. The admin builder shows time inputs as-is (UTC). If you need timezone-aware bonus rules, you'd need to convert the member's local time to UTC before evaluating.

---

## 12. Birthday Rewards

Birthday rewards are completely independent of the regular stamp progress.

**Setup (in loyalty_programs):**
```javascript
birthday_reward_enabled: true,
birthday_reward_name: "Birthday Coffee on Us",
birthday_reward_description: "Enjoy a free drink of your choice on your birthday month!"
```

**Member eligibility check (on card load):**

```javascript
const leadBirthday = accountData.leads?.birthday;
if (programData?.birthday_reward_enabled && leadBirthday) {
  const now = new Date();
  const bday = new Date(leadBirthday);

  // Compare month only (UTC month numbers, both 1-indexed)
  if ((bday.getUTCMonth() + 1) === (now.getUTCMonth() + 1)) {
    // Check if already redeemed this calendar month
    const monthStart = new Date(Date.UTC(year, month-1, 1)).toISOString();
    const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59)).toISOString();

    const existingBday = await supabase
      .from('loyalty_redemptions')
      .select('id')
      .eq('loyalty_account_id', accountData.id)
      .eq('redemption_source', 'birthday')
      .gte('created_at', monthStart)
      .lte('created_at', monthEnd)
      .maybeSingle();

    setBirthdayEligible(!existingBday);
  }
}
```

**Birthday redemption (calls a separate edge function):**

```javascript
const response = await fetch(`${SUPABASE_URL}/functions/v1/redeem-birthday-reward`, {
  method: 'POST',
  body: JSON.stringify({
    memberCode: account.member_code,
    campaignId: campaign.id,
    deviceInfo: { userAgent: navigator.userAgent, timestamp: Date.now() },
  }),
});
const result = await response.json();
navigate(`/redeem/${result.shortCode}?token=${result.redemptionToken}`);
```

**Key rules:**
- Birthday is matched by **month only** (not day). The full birthday month counts.
- Only **one birthday redemption per calendar month** (checked against `loyalty_redemptions` where `redemption_source = 'birthday'`).
- Birthday reward does **not** affect `current_progress` or `reward_unlocked` — it's completely independent.
- Birthday reward still calls the Reward Hub (via the edge function) to generate a short code.

---

## 13. Reward Redemption Flow

**Triggered by:** "Redeem Your Reward" button tap

**Step 1 — Check lockout** (same as visit confirmation)

**Step 2 — Open StaffValidationModal** with `actionType = 'redemption'`

**Step 3 — On validation success, call edge function**

```javascript
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/confirm-loyalty-action`,
  {
    method: 'POST',
    body: JSON.stringify({
      memberCode: account.member_code,
      campaignId: campaign.id,
      actionType: 'redemption',
      deviceInfo: { userAgent: navigator.userAgent, timestamp: Date.now() },
      // rewardTierId: optional — omit to let edge function select the first eligible tier
    }),
  }
);
const result = await response.json();
```

**Step 4 — Navigate to redemption page on success**

```javascript
navigate(`/redeem/${result.shortCode}?token=${result.redemptionToken}`);
```

This URL lives on the **Reward Hub** application.

**Reset vs Rollover (calculated in edge function):**

```javascript
const resetBehavior = loyaltyProgram.reset_behavior || 'reset';

const newProgress = resetBehavior === 'rollover'
  ? Math.max(0, account.current_progress - threshold)
  : 0;
```

- **Reset:** Card goes back to 0 stamps after redemption.
- **Rollover:** Excess stamps carry over. If threshold is 10 and member had 12 stamps, they start the next card with 2 stamps.

---

## 14. The Admin Builder

The loyalty program is configured through an admin builder in the dashboard. It has the following tabs:

### Tab 1: Settings

**Section: Program Details**
- Program Name (text input)
- Program ID (read-only)

**Section: Reward Configuration**
- Program Type: `visit` (Visit-Based) | `action` (Action-Based)
  - Affects button label: "Confirm Visit" vs "Confirm Purchase"
- Stamps Required (threshold): number, 1-100
- Reward Name: text, e.g. "Free Coffee"
- Reward Description: textarea
- After Reward Claimed: `reset` | `rollover`
- Birthday Reward toggle:
  - When enabled: Birthday Reward Name (text), Birthday Reward Description (textarea)

**Section: Staff Validation**
- Validation Method: `pin` | `icon_single` | `icon_sequence`
  - PIN: shows PIN input (4-6 chars, stored as `validationConfig.pinValue`)
  - Icon Single: shows icon picker grid (all 19 icons); selection stored as `validationConfig.targetIcon`
  - Icon Sequence: shows sequence builder (2-5 icons with reorder/remove); stored as `validationConfig.iconSequence`
- Failed Attempt Lockout: number 1-10 (stored as `lockoutThreshold`)
- Visit Cool Down: number 0-24 (hours between stamps; 0 = no limit; stored as `coolDownHours` in `config.loyalty`)

**Section: Scheduling**
- Timezone: dropdown (UTC, US timezones, European, Asia/Pacific)
- Start Date: datetime-local (optional)
- End Date: datetime-local (optional)

**Section: Enrollment Link & QR Code**
- Enrollment URL: read-only, with copy button
- QR code: rendered live with `qrcode.react`, downloadable as PNG

---

### Tab 2: Design

Controls the visual appearance of the loyalty card:

| Field | Key | Default |
|-------|-----|---------|
| Primary Color | `card.primaryColor` | `#F59E0B` |
| Background Color | `card.backgroundColor` | `#18181B` |
| Stamp Icon | `card.stampIcon` | `'star'` (icon ID or `'custom'`) |
| Custom Icon URL | `card.customIconUrl` | `''` |
| Stamp Filled Color | `card.stampFilledColor` | `'#FFFFFF'` |
| Stamp Empty Color | `card.stampEmptyColor` | `'rgba(255,255,255,0.2)'` |
| Heading Color | `card.headingColor` | `'#FFFFFF'` |
| Body Color | `card.bodyColor` | `'#FFFFFF'` |
| Button Text Color | `card.buttonTextColor` | `'#FFFFFF'` |
| Show Logo | `card.showLogo` | `true` |
| Show QR Code | `card.showQR` | `true` |

---

### Tab 3: Screens

Controls the text and appearance of public-facing screens:

**Enrollment Screen:**
| Field | Default |
|-------|---------|
| Headline | "Join Our Rewards Program" |
| Subheadline | "Earn stamps with every visit and get rewarded!" |
| Button Text | "Sign Up Now" |
| Background Color | client background color |
| Heading Color | `#FFFFFF` |
| Body Color | `#FFFFFF` |
| Button Color | card primary color |
| Button Text Color | `#FFFFFF` |
| Background Image URL | (empty) |

**Reward Screen:**
| Field | Default |
|-------|---------|
| Headline | "Congratulations!" |
| Subheadline | "You've earned your reward!" |
| Button Text | "Claim Reward" |
| Expiry Days | `30` |

---

### Tab 4: Reward Catalog

Manages `campaign_rewards` and `campaign_bonus_rules` for this campaign.

**Reward Tiers:**
- List of tiers with: threshold badge (colored by type), name, value, active toggle, edit, delete buttons
- Up/down arrows to reorder (`sort_order`)
- "Add Tier" button opens inline form with: name*, threshold*, type, value, description, active checkbox
- Validation: name required, threshold must be positive integer, no duplicate thresholds

**Reward Types and their colors:**
```javascript
const typeColors = {
  free_item: '#10B981',   // green
  discount: '#F59E0B',    // amber
  vip: '#8B5CF6',         // purple
  birthday: '#EC4899',    // pink
  custom: '#6B7280',      // gray
};
```

**Bonus Rules:**
- List of rules with: name, multiplier badge, rule label, active toggle, edit, delete
- "Add Rule" button opens inline form with: name*, rule type, multiplier*, day of week (if applicable), start/end time (if time_window), active checkbox
- Preview label shows friendly description before saving (e.g., "Double Stamps on Tuesday")

---

### Tab 5: Members

Member management panel (see [Section 15](#15-member-management)).

---

## 15. Member Management

**Table columns:**

| Column | Source |
|--------|--------|
| Name | `leads.name` |
| Email | `leads.email` |
| Stamps | `loyalty_accounts.current_progress` |
| Total Visits | `loyalty_accounts.total_visits` |
| Enrolled | `loyalty_accounts.enrolled_at` |
| Status | Computed: Locked / Reward Ready / Active |
| Actions | View Activity, Unlock (if locked) |

**Member Activity Modal:**
Clicking "View Activity" on a member opens a modal showing their `loyalty_progress_log` entries in reverse chronological order. Each entry shows:
- Action type (visit confirmed, reward unlocked, reward redeemed)
- Stamp value added
- Bonus rule applied (if any)
- Timestamp

**Unlock from admin:**
Admin can unlock a locked member card directly from the member table without needing the manager PIN (they are already authenticated).

**Export:**
CSV export of all members with their progress data.

---

## 16. Full Config JSON Structure

This is the complete `campaigns.config` JSON object for a loyalty campaign. All fields are stored here and also synced to `loyalty_programs`.

```javascript
{
  loyalty: {
    // Core settings (synced to loyalty_programs table)
    programType: "visit",           // "visit" | "action"
    threshold: 10,                  // stamps required for reward
    rewardName: "Free Coffee",
    rewardDescription: "A complimentary drink of your choice",
    validationMethod: "pin",        // "pin" | "icon_single" | "icon_sequence"
    validationConfig: {
      // For PIN:
      pinValue: "1234",
      pinLength: 4,
      pinType: "numeric",           // "numeric" | "alphanumeric"

      // For icon_single:
      targetIcon: "heart",          // icon ID from loyaltyIcons

      // For icon_sequence:
      iconSequence: ["heart", "star", "coffee"],  // 2-5 icon IDs in order
      sequence: ["heart", "star", "coffee"],       // alias — check both
    },
    lockoutThreshold: 3,            // failed attempts before lockout (1-10)
    resetBehavior: "reset",         // "reset" | "rollover"
    coolDownHours: 0,               // hours between stamps (0 = no limit)

    // Birthday reward settings (synced to loyalty_programs)
    birthdayRewardEnabled: false,
    birthdayRewardName: "Birthday Coffee on Us",
    birthdayRewardDescription: "Enjoy a free drink on your birthday month!",

    // Card visual design
    card: {
      primaryColor: "#F59E0B",
      backgroundColor: "#18181B",
      stampIcon: "star",            // icon ID or "custom"
      customIconUrl: "",            // URL if stampIcon === "custom"
      stampFilledColor: "#FFFFFF",
      stampEmptyColor: "rgba(255,255,255,0.2)",
      headingColor: "#FFFFFF",
      bodyColor: "#FFFFFF",
      buttonTextColor: "#FFFFFF",
      showLogo: true,
      showQR: true,
    },

    // Scheduling settings
    settings: {
      timezone: "America/New_York",
      startDate: "",                // ISO datetime string or empty
      endDate: "",
    },

    // Aliases used in some places (normalize on read)
    validation_method: "pin",       // same as validationMethod
    validation_config: {},          // same as validationConfig
    reward_name: "Free Coffee",     // same as rewardName
    program_type: "visit",          // same as programType
  },

  // Screen content and colors
  screens: {
    enrollment: {
      headline: "Join Our Rewards Program",
      subheadline: "Earn stamps with every visit and get rewarded!",
      buttonText: "Sign Up Now",
      backgroundColor: "#18181B",
      headingColor: "#FFFFFF",
      bodyColor: "#FFFFFF",
      buttonColor: "#F59E0B",
      buttonTextColor: "#FFFFFF",
      backgroundImage: "",          // URL or empty string
      collectPhone: true,
      collectEmail: true,
    },
    reward: {
      headline: "Congratulations!",
      subheadline: "You've earned your reward!",
      buttonText: "Claim Reward",
      expiryDays: 30,               // used by edge function for redemption expiry
    },
  }
}
```

**Field alias note:** The codebase reads both camelCase and snake_case variants in many places due to migration history. When reading config, always check both:
```javascript
const validationMethod = loyaltyConfig.validationMethod || loyaltyConfig.validation_method || 'pin';
const validationConfig = loyaltyConfig.validationConfig || loyaltyConfig.validation_config || {};
const threshold = loyaltyProgram?.threshold || campaign?.config?.loyalty?.threshold || 10;
```

---

## 17. Icon System

There are exactly **19 icons** available. These are used for:
- Stamp icon on the loyalty card
- Validation icons (icon_single and icon_sequence methods)

```javascript
// ID          Name        Library      Color
'heart'      // Heart       react-icons/fi  #EF4444
'star'       // Star        react-icons/fi  #F59E0B
'award'      // Award       react-icons/fi  #8B5CF6
'coffee'     // Coffee      react-icons/fi  #92400E
'wine'       // Wine        react-icons/lu  #7C3AED
'pizza'      // Pizza       react-icons/lu  #EA580C
'gift'       // Gift        react-icons/fi  #EC4899
'music'      // Music       react-icons/fi  #06B6D4
'sun'        // Sun         react-icons/fi  #FBBF24
'moon'       // Moon        react-icons/fi  #6366F1
'cloud'      // Cloud       react-icons/fi  #94A3B8
'droplet'    // Droplet     react-icons/fi  #3B82F6
'feather'    // Feather     react-icons/fi  #10B981
'anchor'     // Anchor      react-icons/fi  #475569
'zap'        // Lightning   react-icons/fi  #EAB308
'umbrella'   // Umbrella    react-icons/fi  #F43F5E
'shopping'   // Shopping    react-icons/fi  #14B8A6
'camera'     // Camera      react-icons/fi  #64748B
'scissors'   // Scissors    react-icons/lu  #71717A
```

**Utility functions used throughout the app:**

```javascript
getIconById(id)
// Returns { id, name, icon (component), color } or undefined

getRandomIcons(count, excludeIds = [])
// Returns `count` random icons, excluding the given IDs

shuffleArray(array)
// Fisher-Yates shuffle, returns new array
```

**When building the icon grid for validation:**
- Always show exactly 16 icons (4x4 grid)
- Slice 16 random icons from the shuffled full set
- Ensure the target icon(s) are included — if not, replace a random position

---

## 18. Edge Functions — Full Logic

### 18.1 `confirm-loyalty-action`

**Called from:** loyalty card page, using `SUPABASE_ANON_KEY` as bearer token

**Request:**
```typescript
{
  memberCode: string;
  campaignId: string;
  actionType: "visit" | "redemption";
  deviceInfo?: { userAgent: string; timestamp: number };
  rewardTierId?: string;     // optional: specific tier to redeem
  bypassCoolDown?: boolean;  // true = skip cool-down check
}
```

**Full processing logic for `actionType = "visit"`:**

```
1. Validate required fields (memberCode, campaignId, actionType)
2. Fetch loyalty_accounts + leads(name, email) by memberCode + campaignId
   → 404 if not found
3. Fetch validation_lockouts where loyalty_account_id = account.id AND unlocked_at IS NULL
   → 403 if locked
4. Fetch campaigns + loyalty_programs by campaignId
   → 404 if not found
   → 403 if campaign.status = 'paused'
5. Read threshold from loyaltyProgram.threshold (fallback: 10)
6. COOL-DOWN CHECK (if coolDownHours > 0 AND bypassCoolDown !== true):
   - Fetch most recent loyalty_progress_log where action_type IN ('visit_confirmed', 'reward_unlocked')
   - If lastVisit exists AND (now - lastVisit) < coolDownHours:
     → 429 with { coolDown: true, error: "Next stamp available at {time}", nextAvailableAt }
7. BONUS RULE EVALUATION:
   - Fetch active campaign_bonus_rules for this campaign
   - Evaluate each rule against current UTC time/day
   - Select rule with highest multiplier (default 1 if none match)
   - stampValue = roundHalfUp(1 * multiplier)  // Math.floor(value + 0.5)
8. Compute newProgress = account.current_progress + stampValue
9. TIER CROSSING CHECK:
   - Fetch active campaign_rewards ordered by threshold ASC
   - crossedTiers = rewards where oldProgress < threshold <= newProgress
   - anyRewardUnlocked = crossedTiers.length > 0 OR newProgress >= threshold
10. UPDATE loyalty_accounts:
    - current_progress = newProgress
    - total_visits = total_visits + 1
    - reward_unlocked = anyRewardUnlocked
    - reward_unlocked_at = now (if newly unlocked)
11. INSERT loyalty_progress_log:
    - action_type = anyRewardUnlocked ? 'reward_unlocked' : 'visit_confirmed'
    - stamp_value = stampValue
    - bonus_rule_id = appliedRule?.id or null
    - device_info = deviceInfo
12. Return 200:
    {
      success: true,
      newProgress,
      rewardUnlocked: (crossedTiers.length > 0 || (noTiers && newProgress >= threshold)),
      threshold,
      stampValue,
      bonusApplied: appliedRule !== null,
      bonusRuleName: appliedRule?.name || null,
      unlockedRewards: [{ tierId, rewardName, threshold }]
    }
```

**Full processing logic for `actionType = "redemption"`:**

```
1-5. Same validation steps as visit
6. Check account.reward_unlocked = true
   → 400 if false ("No reward available to redeem")
7. Determine reset behavior: loyaltyProgram.reset_behavior || 'reset'
8. Determine expiry: config.screens.redemption.expiryDays || 30
9. Determine which tier to redeem:
   - If rewardTierId provided: fetch that specific campaign_rewards row
   - If not provided: fetch first active campaign_rewards row (lowest threshold)
   - If no tiers exist: use loyaltyProgram.reward_name
10. Compute newProgress:
    - reset: 0
    - rollover: Math.max(0, current_progress - threshold)
11. Generate shortCode: 6 chars from "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
12. Generate redemptionToken: crypto.randomUUID()
13. INSERT into redemptions table:
    {
      campaign_id, client_id,
      prize_name: rewardName,
      short_code: shortCode,
      redemption_token: redemptionToken,
      token_expires_at: expiresAt,
      email: account.leads.email,
      status: 'valid',
      expires_at: expiresAt,
      metadata: {
        loyalty_account_id: account.id,
        member_code: account.member_code,
        member_name: account.leads.name,
        source: 'loyalty_program'
      }
    }
14. INSERT into loyalty_redemptions:
    {
      loyalty_account_id: account.id,
      campaign_id,
      short_code: shortCode,
      status: 'valid',
      expires_at: expiresAt,
      redemption_id: redemption.id,
      redemption_source: 'standard',
      reward_tier_id: tierId
    }
15. UPDATE loyalty_accounts:
    - current_progress = newProgress
    - reward_unlocked = false
    - reward_unlocked_at = null
16. INSERT loyalty_progress_log:
    - action_type = 'reward_redeemed'
    - stamp_value = 0
17. Fire-and-forget: POST to /functions/v1/send-redemption-email { redemptionId }
18. Return 200:
    {
      success: true,
      shortCode,
      redemptionToken,
      newProgress,
      rewardName
    }
```

---

### 18.2 `redeem-birthday-reward`

**Called from:** loyalty card page when member taps "Claim Birthday Reward"

**Request:**
```typescript
{
  memberCode: string;
  campaignId: string;
  deviceInfo?: { userAgent: string; timestamp: number };
}
```

**Processing:**

```
1. Fetch loyalty_accounts + leads(name, email, birthday) by memberCode + campaignId
   → 404 if not found
2. Check lead.birthday exists
   → 400 "No birthday on file"
3. Check birthday month == current UTC month
   → 400 "Birthday reward is only available during your birthday month"
4. Fetch loyalty_programs for this campaign
   → 400 if birthday_reward_enabled !== true
5. Check for existing birthday redemption this calendar month:
   SELECT id FROM loyalty_redemptions
   WHERE loyalty_account_id = account.id
   AND campaign_id = campaignId
   AND redemption_source = 'birthday'
   AND created_at BETWEEN monthStart AND monthEnd
   → 400 "Birthday reward has already been redeemed this month"
6. Generate shortCode and redemptionToken
7. INSERT into redemptions table (same as regular redemption but source = 'birthday_reward')
8. INSERT into loyalty_redemptions with redemption_source = 'birthday'
9. INSERT loyalty_progress_log: action_type = 'reward_redeemed', stamp_value = 0
10. Fire-and-forget email
11. Return 200: { success: true, shortCode, redemptionToken, rewardName, expiresAt }
```

---

### 18.3 Short Code Generation

Both edge functions use the same algorithm:
```javascript
function generateShortCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
// Characters excluded: 0 (zero), O (letter O), 1 (one), I (letter I)
// Total character space: 32 chars
// Total combinations: 32^6 = 1,073,741,824
```

---

## 19. Public Routes Summary

All public (no authentication) routes:

| Route | Component | Notes |
|-------|-----------|-------|
| `/loyalty/:campaignSlug` | LoyaltyEnrollmentPage | Checks device token first |
| `/loyalty/:campaignSlug/:memberCode` | LoyaltyCardPage | No auth, just memberCode |

The redemption routes (e.g., `/redeem/:shortCode`) live on the **Reward Hub** application, not here.

---

## 20. Branding and Theming

**The loyalty card's visual appearance is fully configurable** per campaign. The card reads from `campaign.config.loyalty.card.*`.

**Background color detection for enrollment page:**
The enrollment and paused screens automatically detect if the background is light or dark and adjust text colors:
```javascript
const isLightBackground = (color) => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155;
};
const isDark = !isLightBackground(backgroundColor);
// If isDark: use white text, white borders
// If light: use dark text, dark borders
```

**Color fallback chain:**
```
config.loyalty.card.primaryColor → client.primary_color → '#F59E0B'
config.loyalty.card.backgroundColor → client.background_color → '#18181B'
config.screens.enrollment.backgroundColor → client.background_color → '#18181B'
```

**Birthday banner:** Always uses a hardcoded gradient: `linear-gradient(135deg, #ec4899, #f97316)` — not configurable.

---

## 21. Integration with the Reward Hub

When a reward is earned (either standard or birthday), this application calls the Reward Hub's `issue-redemption` API.

**Registration:** Each loyalty campaign must be registered as a **spoke** in the Reward Hub. The hub assigns an API key to the spoke.

**Spoke API key storage:** Store in Supabase Vault or Edge Function secrets as `REWARD_HUB_API_KEY`.

**Calling the hub from the edge function:**

```javascript
// Inside confirm-loyalty-action, replace the current redemptions table insert with:
const hubResponse = await fetch(`${HUB_URL}/api/v1/redemptions/issue`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${REWARD_HUB_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    reward_catalog_id: hubCatalogItemId,  // pre-mapped from tier ID
    member: {
      external_id: account.id,
      name: account.leads.name,
      email: account.leads.email,
    },
    metadata: {
      source: 'loyalty_card',
      campaign_id: campaignId,
      tier_id: tierId,
    },
  }),
});
const hubResult = await hubResponse.json();
const { short_code: shortCode, token: redemptionToken, redemption_url } = hubResult;
```

**Catalog item mapping:** Store a mapping from `campaign_rewards.id` → `hub reward_catalog_items.id` either in the `campaign_rewards` table (add a `hub_catalog_item_id` column) or in a separate mapping table.

**Until the Reward Hub is available:** The current implementation writes directly to a local `redemptions` table. This table can be migrated to the hub later. The critical data that must eventually reach the hub:
- Member name + email
- Reward name
- Expiry (from `expiryDays`)
- Source metadata

---

## 22. What This App Does NOT Own

The following concerns belong to the Reward Hub or other systems:

- **`redemptions` table lifecycle** — Once a short code is issued, the hub manages its state (valid → redeemed → expired). This app should not update redemption status.
- **The `/redeem/:shortCode` page** — This is on the hub. After generating a code, just navigate there.
- **Email notifications** — The hub triggers these via `send-redemption-email`. This app fire-and-forgets the call; it doesn't need to know if it succeeded.
- **Staff redemption confirmation** — The hub's public redemption page handles "Mark as Redeemed." This app has no role in that flow.
- **Analytics across campaigns** — The hub aggregates redemption data across all spoke applications. This app only tracks loyalty-specific metrics (stamp counts, visit logs).

---

*This document contains enough detail to build the complete loyalty card application from scratch. The edge function logic sections (Section 18) can be used directly as the implementation specification — they reproduce the exact business logic from the existing codebase.*
