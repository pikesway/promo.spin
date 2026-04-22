# Product Requirements Document: Standalone Loyalty Program System

**Document Version:** 1.0
**Date:** 2026-04-22
**Status:** Draft
**Prepared by:** Lead System Analyst
**Target audience:** A developer (or an AI pair-programmer such as Claude) building this system from scratch as a greenfield project ("vibe-coded"). Every section is written to be self-contained, unambiguous, and directly actionable.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Goals and Success Metrics](#3-goals-and-success-metrics)
4. [System Overview](#4-system-overview)
5. [User Personas and Roles](#5-user-personas-and-roles)
6. [Core Concepts and Domain Model](#6-core-concepts-and-domain-model)
7. [Functional Requirements](#7-functional-requirements)
8. [Program Configuration](#8-program-configuration)
9. [Stamp / Visit Mechanics](#9-stamp--visit-mechanics)
10. [Validation Methods (Staff Verification)](#10-validation-methods-staff-verification)
11. [Bonus Rules and Multipliers](#11-bonus-rules-and-multipliers)
12. [Multi-Tier Rewards](#12-multi-tier-rewards)
13. [Birthday Rewards](#13-birthday-rewards)
14. [Redemption Flow](#14-redemption-flow)
15. [Reward Hub Integration](#15-reward-hub-integration)
16. [Enrollment and Device Tokens](#16-enrollment-and-device-tokens)
17. [Lockouts and Manager Override](#17-lockouts-and-manager-override)
18. [Card Design and Theming](#18-card-design-and-theming)
19. [Admin Builder UX](#19-admin-builder-ux)
20. [Member Management](#20-member-management)
21. [Analytics and Reporting](#21-analytics-and-reporting)
22. [Security and RLS](#22-security-and-rls)
23. [Edge Function Contracts](#23-edge-function-contracts)
24. [Data Model Requirements](#24-data-model-requirements)
25. [Non-Functional Requirements](#25-non-functional-requirements)
26. [Out of Scope](#26-out-of-scope)
27. [Open Questions](#27-open-questions)
28. [Appendix A: Icon Library](#appendix-a-icon-library)
29. [Appendix B: Reference User Flows](#appendix-b-reference-user-flows)

---

## 1. Executive Summary

This document defines the product requirements for a **Standalone Loyalty Program System** — a digital stamp-card application that enables businesses to issue, manage, and redeem loyalty programs for their customers.

The system is the first and primary **spoke** of the Standalone Reward System (the "hub"). It owns all concerns related to earning stamps, progressing toward tier thresholds, tracking member activity, and triggering reward issuance. It delegates the generation, display, and claiming of redemption codes to the Reward Hub via a documented webhook/API contract.

This PRD is written to allow a new developer (or AI assistant) to rebuild the loyalty program from nothing. It documents not only WHAT to build but WHY, and captures every non-obvious business rule, edge case, and data invariant that exists in the current production implementation.

The technology stack assumed throughout this document is:

- **Frontend:** React (Vite), React Router v7, Tailwind CSS, Framer Motion, react-icons
- **Backend:** Supabase (Postgres + Row Level Security + Edge Functions running Deno)
- **Persistence:** Supabase Postgres (the only database; `ALWAYS use it`)
- **Auth:** Supabase Auth with email/password
- **Hosting:** Static frontend (Vercel/Netlify/any CDN); edge functions on Supabase

---

## 2. Problem Statement

Small and mid-market businesses want a digital replacement for paper punch cards that is:

- Fraud-resistant (customers cannot self-stamp)
- Friction-light (customers do not need an app install)
- Brand-customizable (card matches the business's look and feel)
- Analytics-enabled (owners can see visits, members, redemptions)
- Multi-location / multi-brand aware (a single operator can run many brands)

Existing products are either expensive, closed-source, tied to POS systems, or lack the fraud protection needed to prevent members from faking stamps. This system delivers a web-based, QR-driven loyalty card with staff-side validation, tier rewards, bonus days, and full audit history.

---

## 3. Goals and Success Metrics

### Goals

| ID | Goal |
|----|------|
| G1 | Members can enroll in under 30 seconds and use their card without installing an app |
| G2 | Staff can validate a visit in under 5 seconds with a single challenge |
| G3 | Every stamp is tied to a staff validation event (no self-serve stamping) |
| G4 | Client admins can build and launch a program in under 10 minutes |
| G5 | All reward codes are issued by the Reward Hub (single source of truth) |
| G6 | The system cleanly supports a multi-client, multi-brand hierarchy |

### Success Metrics

| Metric | Target |
|--------|--------|
| Member enrollment completion rate | > 85% |
| Staff visit validation p95 time | < 3 seconds |
| False-stamp rate (after lockout) | < 0.1% |
| Admin config-to-launch time (new program) | < 10 minutes |
| Card page load (including preview of stamps) | < 1.5s p95 |

---

## 4. System Overview

```
                 +--------------------------+
                 |     Admin Builder UI      |
                 |  (LoyaltyProgramBuilder)  |
                 +-------------+-------------+
                               |
                  config writes v
 +------------------+   +------+------+   +------------------+
 |   Member         |-->|  Supabase   |<--|  Edge Functions  |
 |   (Card UI)      |   |  (Postgres) |   |  (Deno runtime)  |
 +------------------+   +------+------+   +--------+---------+
                               |                   |
                               |                   | calls Hub API
                               |                   v
                               |         +--------------------+
                               |         |   Reward Hub       |
                               |         |  (Standalone)      |
                               |         +--------------------+
                               |
                               v
                    +---------------------+
                    |   Staff Dashboard   |
                    |  (Member mgmt)      |
                    +---------------------+
```

### Hub / Spoke boundary

The loyalty program is a **spoke**. It is fully responsible for:

- Enrollment forms and member record creation
- Stamp accumulation and threshold detection
- Validation workflows (PIN / icon challenges)
- Bonus rule evaluation
- Device token ("remember me") management
- Program configuration and card theming

The loyalty program is NOT responsible for:

- Generating redemption short codes and tokens (that is the Hub's job)
- Rendering the public redemption page the cashier marks as claimed
- Sending redemption emails
- Tracking redemption state transitions (valid / redeemed / expired)

When a member crosses a threshold and asks to redeem, the loyalty spoke calls the Hub's `POST /api/v1/redemptions/issue` endpoint and displays the returned short code / URL to the member.

---

## 5. User Personas and Roles

| Role | Description |
|------|-------------|
| **Platform Admin** | Operates the SaaS for all clients. Can impersonate any client for support. |
| **Client Admin** | Owns one or more brands. Builds programs, views stats, manages staff. |
| **Brand Manager** | Manages programs for a single brand. Delegated by the Client Admin. |
| **Staff / Cashier** | On-the-ground employee who validates customer visits. Needs only the validation UI, not configuration. |
| **Manager** | A staff user with elevated privileges. Can unlock locked accounts via override PIN. |
| **Member / Customer** | Enrolled in a program, earning stamps. Unauthenticated; identified by `member_code` + device token. |

---

## 6. Core Concepts and Domain Model

| Concept | Definition |
|---------|-----------|
| **Client** | A top-level tenant (business entity). |
| **Brand** | A sub-tenant of a client. Has its own branding and programs. |
| **Campaign** | A single loyalty program instance. One-to-one with `loyalty_programs`. |
| **Loyalty Account** | A member's enrollment in a single campaign. `(member_code, campaign_id)` is unique. |
| **Stamp** | A single unit of progress. Usually 1 per visit but can be multiplied by bonus rules. |
| **Threshold** | Stamps required to unlock a reward. Integer 1-100. |
| **Tier** | A reward level within a campaign. A campaign can have multiple tiers (e.g., 5 stamps = free drip, 10 = free latte, 20 = free lunch). |
| **Bonus Rule** | A rule that multiplies stamp value on qualifying visits (e.g., double stamps Tuesdays). |
| **Validation** | The challenge a staff member completes to prove they authorized the stamp. |
| **Lockout** | A state where a member's account cannot earn stamps until a manager unlocks it. |
| **Device Token** | A UUID stored in localStorage allowing a returning customer to skip re-enrollment for 60 days. |
| **Member Code** | A unique 8-character alphanumeric string (unambiguous charset) identifying a member within a campaign. Encoded in the QR shown on the card. |
| **Redemption** | The hub-owned entity representing a reward code issued to a member. |

---

## 7. Functional Requirements

### 7.1 Member Enrollment

| ID | Requirement |
|----|-------------|
| FR-01 | A public enrollment URL MUST exist per campaign at `/loyalty/{campaignSlug}`. |
| FR-02 | On load, the page MUST check localStorage for a device token matching this campaign. If valid and not expired, the user is redirected to the card view without re-enrolling. |
| FR-03 | The enrollment form MUST collect: name (required), email (required, unique per campaign), phone (optional, configurable), birthday (optional, only if birthday rewards are enabled). |
| FR-04 | A "Remember this device" checkbox MUST be present and default to checked. |
| FR-05 | On submit, the system MUST create (or retrieve) the `loyalty_account`, generate a unique `member_code`, and optionally create a `loyalty_device_token`. |
| FR-06 | Email uniqueness MUST be enforced per campaign: if an email already exists for this campaign, return the existing account (idempotent). |
| FR-07 | On success, the user is redirected to `/loyalty/{campaignSlug}/card`. |
| FR-08 | The enrollment screen's copy (headline, subheadline, button text, background image, colors) MUST be fully customizable by the Client Admin. |

### 7.2 Card Display

| ID | Requirement |
|----|-------------|
| FR-09 | The card page MUST display the member's current progress as a grid of filled and empty stamp icons. |
| FR-10 | The card MUST show the brand's logo (if configured) and the member's QR code (encoded with the `member_code`). |
| FR-11 | The card MUST show a "Confirm Visit" button when progress < threshold. |
| FR-12 | The card MUST show a "Redeem Your Reward" button when `reward_unlocked = true`. |
| FR-13 | The card MUST show a "Claim Birthday Reward" button if the member is in their birthday month AND a birthday reward is enabled AND they have not already claimed this month. |
| FR-14 | The card MUST reflect the currently-configured design (colors, icons, layout) in real time — no page reload required after admin saves config. |
| FR-15 | If the member is locked out, the card MUST show a "Account Locked — ask staff for assistance" state with no action buttons. |
| FR-16 | On confirm visit, the card MUST open a StaffValidationModal. |
| FR-17 | On successful validation, the card MUST animate the newly-earned stamp(s) filling in and update progress text. |

### 7.3 Reward Unlock Detection

| ID | Requirement |
|----|-------------|
| FR-18 | Reward unlock is computed server-side every time progress changes. |
| FR-19 | `reward_unlocked = true` when `current_progress >= threshold`. |
| FR-20 | For multi-tier programs, a tier is newly unlocked when the pre-visit progress was below its threshold and the post-visit progress is at or above it. The system MUST log each newly-unlocked tier as a separate `reward_unlocked` row in `loyalty_progress_log`. |

### 7.4 Redemption Trigger

| ID | Requirement |
|----|-------------|
| FR-21 | Clicking "Redeem Your Reward" opens a StaffValidationModal. |
| FR-22 | On validation success, the loyalty spoke MUST call the Reward Hub's issuance API to request a redemption code. |
| FR-23 | On Hub response, the spoke MUST insert a local `loyalty_redemptions` row linking the returned `redemption_id` to the loyalty account. |
| FR-24 | The spoke MUST reset (or rollover) the member's progress per the program's configured `reset_behavior`. |
| FR-25 | The spoke MUST redirect the member to the Hub's redemption URL, where the cashier will mark as redeemed. |

---

## 8. Program Configuration

### 8.1 Program Fields

Every `loyalty_programs` record MUST support:

| Field | Type | Description |
|-------|------|-------------|
| `program_type` | enum | `visit` or `action` |
| `threshold` | int (1-100) | Base stamps to unlock |
| `validation_method` | enum | `pin`, `icon_single`, `icon_sequence`, `icon_position` |
| `validation_config` | jsonb | Method-specific settings (see §10) |
| `reward_name` | text | Fallback reward name if no tier matches |
| `reward_description` | text | Optional longer text |
| `reset_behavior` | enum | `reset` or `rollover` |
| `lockout_threshold` | int (1-10) | Failed attempts before lockout (default 3) |
| `cooldown_hours` | numeric | Hours between visits (0 to disable) |
| `birthday_reward_enabled` | bool | Whether birthday flow is available |
| `birthday_reward_name` | text | Name shown for birthday reward |
| `expiry_days` | int | How long redemption codes last (default 30) |
| `timezone` | text | IANA zone for bonus rule evaluation |
| `reward_catalog_id` | uuid | FK to Hub's reward catalog item for default reward |

### 8.2 Program Lifecycle

| State | Meaning |
|-------|---------|
| `draft` | Not yet live. No public URL works. |
| `active` | Live. Members can enroll and earn stamps. |
| `paused` | New visits blocked; existing redemptions still work. |
| `archived` | Soft-deleted. No public URL; hidden from admin by default. |

---

## 9. Stamp / Visit Mechanics

### 9.1 Base rules

| ID | Requirement |
|----|-------------|
| STAMP-01 | A visit grants exactly 1 stamp by default. |
| STAMP-02 | A visit grants `roundHalfUp(1 * multiplier)` stamps if a bonus rule applies. |
| STAMP-03 | The half-up rounding rule is `Math.floor(value + 0.5)`. E.g., 1.5 → 2, 2.5 → 3, 2.4 → 2. |
| STAMP-04 | Every stamp event MUST write a row to `loyalty_progress_log` with `action_type = 'visit_confirmed'`, `quantity = stampValue`, `bonus_rule_id` (nullable), and device info. |
| STAMP-05 | `total_visits` increments by 1 regardless of bonus multiplier. |
| STAMP-06 | `current_progress` increments by `stampValue`. |

### 9.2 Cooldown

| ID | Requirement |
|----|-------------|
| CD-01 | If `cooldown_hours > 0`, visits that occur sooner than `cooldown_hours` after the last `visit_confirmed` event MUST be rejected with HTTP 429. |
| CD-02 | The rejection response MUST include the next available timestamp so the UI can display a friendly "Come back at {time}" message. |
| CD-03 | Staff override: if the validation is performed with `overrideCooldown: true` from an authenticated admin context, the cooldown MAY be bypassed. |

### 9.3 Action-type programs

| ID | Requirement |
|----|-------------|
| ACT-01 | For `program_type = action`, the "Confirm Visit" affordance is relabeled (e.g., "Record Purchase") per the configured copy. |
| ACT-02 | Action programs MAY pass a `quantity` override allowing multiple stamps per validation. |
| ACT-03 | The bonus multiplier still applies on top of the override quantity. |

---

## 10. Validation Methods (Staff Verification)

All four validation methods below MUST be supported. The admin picks one per program.

### 10.1 PIN validation (`pin`)

- `validation_config.pinValue`: a 4-6 digit PIN (string).
- UI: a numeric keypad. The staff member enters the PIN. Case-insensitive.
- On match: success. On mismatch: shake animation, increment failed-attempt counter.
- If `failed_attempts >= lockout_threshold` within a single account session, open a validation lockout record (see §17).

### 10.2 Icon single select (`icon_single`)

- `validation_config.targetIcon`: one icon key from the library (Appendix A).
- UI: a shuffled grid of 6-9 icons. The target icon is always included plus random distractors from the library.
- On correct tap: success. On wrong tap: failure + shake. No second chance in the same modal (close and reopen).

### 10.3 Icon sequence (`icon_sequence`)

- `validation_config.iconSequence`: array of 2-5 icon keys in order.
- UI: a 4x4 grid (16 slots) containing all sequence icons plus random distractors, shuffled.
- Staff taps each icon in order. Numbered badges (1, 2, 3, ...) appear on tapped icons.
- A "Clear" button resets the current attempt without recording a failure.
- Submitting in the wrong order counts as one failed attempt.

### 10.4 Icon position (`icon_position`)

- `validation_config.targetIcon`: the icon to look for.
- `validation_config.targetPosition`: integer 0..n-1, the zero-indexed slot in the grid.
- UI: a 3x3 or 4x4 grid filled with distractors; the target icon appears at exactly `targetPosition`.
- Staff must tap the correct position (not just the correct icon).

### 10.5 Common behavior

| ID | Requirement |
|----|-------------|
| VAL-01 | Every validation attempt (success or failure) MUST insert a row in `validation_attempts` with `attempt_type`, `success`, and device info. |
| VAL-02 | Consecutive failures (by `loyalty_account_id`, in the trailing 24 hours) that reach the lockout threshold MUST trigger a `validation_lockouts` row. |
| VAL-03 | Validation is performed server-side in the `confirm-loyalty-action` edge function. The client MUST NOT rely on client-side comparisons alone. |
| VAL-04 | Each validation UI MUST support touch, mouse, and keyboard input for accessibility. |

---

## 11. Bonus Rules and Multipliers

### 11.1 Concept

A program MAY have zero or more bonus rules in `campaign_bonus_rules`. Each rule has a `multiplier` (float >= 1.0) and a type-specific condition.

### 11.2 Rule types

| Type | Config | Matches when |
|------|--------|--------------|
| `day_of_week` | `{ "days": [0,2,4] }` (0=Sun..6=Sat) | Current day-of-week is in the list |
| `time_window` | `{ "start": "HH:MM", "end": "HH:MM" }` | Current time is within window (inclusive). Windows that wrap midnight are supported. |
| `custom_simple` | `{}` | Always matches (a flat multiplier reserved for future use) |

### 11.3 Evaluation

| ID | Requirement |
|----|-------------|
| BR-01 | All active rules MUST be evaluated at each visit. |
| BR-02 | The highest matching `multiplier` wins. |
| BR-03 | If no rule matches, multiplier = 1.0 (no bonus). |
| BR-04 | Evaluation timezone MUST be `loyalty_programs.timezone` (IANA). All comparisons MUST use this zone. |
| BR-05 | The winning rule's ID MUST be stored on the resulting `loyalty_progress_log` row (`bonus_rule_id`) for auditability. |

---

## 12. Multi-Tier Rewards

### 12.1 Concept

A campaign MAY have 1 to N reward tiers, each with its own threshold and reward catalog item. Tiers are ordered by threshold ascending.

### 12.2 Requirements

| ID | Requirement |
|----|-------------|
| TIER-01 | Tiers live in `campaign_rewards` (or equivalent), each with: `threshold`, `reward_catalog_id`, `name`, `description`, `sort_order`, `is_active`. |
| TIER-02 | On each visit, after updating progress, the system MUST identify newly-unlocked tiers (`old_progress < tier.threshold <= new_progress`) and log each one as `action_type = 'reward_unlocked'` in `loyalty_progress_log`. |
| TIER-03 | The card UI MUST show the NEXT unclaimed tier prominently ("3 more stamps for a free latte"). |
| TIER-04 | When the member chooses to redeem, they MUST be able to pick which unlocked tier to redeem (if more than one is available). |
| TIER-05 | Redeeming a tier resets/rolls over ONLY that tier's threshold relative to total progress. Specifically, `rollover` subtracts that tier's threshold from `current_progress`; `reset` zeroes progress and forfeits any un-claimed higher tiers. |
| TIER-06 | If a single visit crosses multiple tier thresholds simultaneously, all crossed tiers MUST be flagged as unlocked and logged. The member can redeem each one individually. |

---

## 13. Birthday Rewards

### 13.1 Eligibility

A member is eligible for a birthday reward in month M if ALL of:

1. `loyalty_programs.birthday_reward_enabled = true`
2. `loyalty_accounts.birthday` is set and its month = M (UTC)
3. The member has NOT already claimed a birthday reward this calendar month (checked via `loyalty_redemptions` where `redemption_source = 'birthday'` and `created_at` is in [monthStart, monthEnd])

### 13.2 Redemption

- A dedicated edge function `redeem-birthday-reward` handles the flow.
- No staff validation is required (the birthday is the validation).
- The function calls the Reward Hub exactly like a regular redemption, tagging `redemption_source = 'birthday'` and using the program's birthday reward catalog item.
- `current_progress` is NOT modified.

### 13.3 UI

The card MUST show a "Claim Birthday Reward" CTA only when eligible. Once claimed, the CTA disappears for the rest of the month.

---

## 14. Redemption Flow

```
 reward_unlocked = true
        |
        v
 Member taps "Redeem"
        |
        v
 StaffValidationModal
        |
        v
 (success)
        |
        v
 POST /functions/v1/confirm-loyalty-action
   { actionType: "redemption", memberCode, campaignId, tierId? }
        |
        v
 Edge function:
   1. Re-verifies reward_unlocked
   2. Calls Hub POST /api/v1/redemptions/issue
   3. Inserts loyalty_redemptions row (FK to Hub redemption)
   4. Updates loyalty_accounts (progress reset/rollover; reward_unlocked false)
   5. Logs 'reward_redeemed' in progress_log
   6. Async: emits email via Hub's notification path
        |
        v
 Response: { success, redemption_url, short_code, reward_name }
        |
        v
 Member redirected to Hub's /redeem/{shortCode}?token=... page
        |
        v
 Cashier marks redeemed on Hub's public page
```

### 14.1 Edge cases

| Scenario | Expected behavior |
|----------|-------------------|
| Hub returns error | Do NOT reset progress; show retry UI; roll back local transaction. |
| Device goes offline mid-flow | Retry on next card load; idempotency via `loyalty_accounts.reward_unlocked` state. |
| Member tries to redeem twice | Second attempt sees `reward_unlocked = false` after first success; returns 400 with clear message. |
| Tier chosen no longer unlocked | Return 409 with `"tier_not_unlocked"` error code. |

---

## 15. Reward Hub Integration

The Reward Hub is an external service. This loyalty program talks to it via the Hub's spoke API (documented in the Reward System PRD).

### 15.1 Registration

Each loyalty deployment MUST be registered in the Hub as a spoke. The Hub issues:

- `spoke_id` (uuid)
- `spoke_api_key` (opaque bearer token)
- `spoke_webhook_secret` (HMAC key for verifying inbound webhooks)

These MUST be stored as Supabase Edge Function secrets:
- `HUB_SPOKE_ID`
- `HUB_SPOKE_API_KEY`
- `HUB_API_BASE_URL`
- `HUB_WEBHOOK_SECRET`

### 15.2 Issuance call

```
POST {HUB_API_BASE_URL}/api/v1/redemptions/issue
Authorization: Bearer {HUB_SPOKE_API_KEY}
Content-Type: application/json

{
  "reward_catalog_id": "{tier.reward_catalog_id | program.reward_catalog_id}",
  "member": {
    "external_id": "{loyalty_account.id}",
    "name": "{member.name}",
    "email": "{member.email}",
    "phone": "{member.phone}"
  },
  "metadata": {
    "source": "loyalty_card",
    "campaign_id": "{campaign.id}",
    "tier_id": "{tier.id | null}",
    "redemption_source": "standard | birthday"
  }
}
```

The Hub responds with `{ redemption_id, short_code, token, redemption_url, reward_name, expires_at, issued_at }`. The loyalty spoke mirrors the relevant fields into its `loyalty_redemptions` table.

### 15.3 Inbound webhook

The Hub MAY POST to a spoke-provided webhook URL on redemption state changes:

| Event | Spoke action |
|-------|--------------|
| `redemption.redeemed` | Update `loyalty_redemptions.status = 'redeemed'` and `redeemed_at` |
| `redemption.expired` | Update `loyalty_redemptions.status = 'expired'` |

The spoke MUST verify the HMAC signature before trusting the payload.

---

## 16. Enrollment and Device Tokens

### 16.1 Member code generation

- 8 characters, alphanumeric, unambiguous charset: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no 0/O/1/I).
- Generated cryptographically random on server side.
- Unique per `(campaign_id, member_code)`. Collisions retried up to 5 times.
- Encoded in the member's QR code on the card.

### 16.2 Device token flow

- Key in localStorage: `loyalty_device_{campaignSlug}` → UUID string.
- Server record in `loyalty_device_tokens`: `{ loyalty_account_id, campaign_id, device_token (uuid), device_name (derived from User-Agent), expires_at (now + 60 days), last_used_at }`.
- On card load: client sends `{ deviceToken, campaignSlug }` to a lookup endpoint. If a valid, non-expired row matches, return the account.
- On each successful lookup, `last_used_at` MUST be updated.
- If expired: delete from both localStorage and DB; force re-enrollment.
- Tokens are NOT auto-renewed; a new token is created only on enrollment.

### 16.3 Security

- Tokens are UUIDs; collision / brute-force is not a realistic threat.
- Lost/stolen device: an admin MAY revoke all device tokens for a member from the Member Activity Modal.
- Device tokens MUST NOT be shared across campaigns — each campaign has its own token.

---

## 17. Lockouts and Manager Override

### 17.1 Triggering a lockout

| ID | Requirement |
|----|-------------|
| LOCK-01 | When a member has `>= lockout_threshold` consecutive failed validation attempts in the trailing 24 hours, a row MUST be inserted into `validation_lockouts`. |
| LOCK-02 | While an unresolved lockout exists (`unlocked_at IS NULL`), all `confirm-loyalty-action` calls for that member MUST return 403 `"account_locked"`. |

### 17.2 Manager override

- A manager opens the ManagerOverrideModal and enters a manager PIN.
- The manager PIN is configured at the brand level (`brands.manager_pin` or equivalent, stored hashed).
- On correct PIN, the open lockout row is updated: `unlocked_at = now()`, `unlocked_by = {manager profile id | null}`, `reason_unlocked = "manager_override"`.
- Three incorrect manager PIN entries MUST lock out the override attempt for 15 minutes (per-brand, in-memory is fine).

### 17.3 Visibility

- The card UI shows an "Account Locked" state with a "Ask staff for help" message.
- The admin dashboard shows a "Locked" badge on the member row and a one-click "Unlock" action (available only to manager/admin roles).

---

## 18. Card Design and Theming

The following MUST be configurable per program and reflected live in the preview:

| Option | Type | Notes |
|--------|------|-------|
| `primaryColor` | hex | Main brand color |
| `backgroundColor` | hex | Card background |
| `stampFilledColor` | hex | Color of earned stamps |
| `stampEmptyColor` | hex | Color of pending stamps |
| `textHeadingColor` | hex | Must pass WCAG AA against background |
| `textBodyColor` | hex | Must pass WCAG AA |
| `buttonTextColor` | hex | Must pass WCAG AA against primaryColor |
| `stampIcon` | icon key OR `custom` | From Appendix A, or `customIconUrl` |
| `customIconUrl` | text | Required if `stampIcon = custom` |
| `layout` | enum | `grid`, `row` — visual arrangement of stamps |
| `showLogo` | bool | Show brand logo above card |
| `showQR` | bool | Show QR with `member_code` |
| `font` | enum | From approved font list (max 3 weights) |
| `enrollmentScreen` | object | `{ headline, subheadline, buttonText, backgroundImageUrl, colorScheme }` |
| `rewardScreen` | object | Similar structure for post-redemption splash |

**Color constraints:** NEVER default to purple, indigo, or violet hues. Defaults should be neutral (slate / zinc) with an emerald or blue accent. If the admin picks colors that fail contrast ratios, show a warning but do not block save.

---

## 19. Admin Builder UX

The LoyaltyProgramBuilder is a tabbed interface.

### 19.1 Tabs

1. **Settings** — program type, threshold, validation method & config, lockout, cooldown, reset behavior, birthday toggle, timezone, expiry days, public URL + copy-to-clipboard.
2. **Rewards** — multi-tier editor (add/edit/delete/reorder tiers; each bound to a Reward Hub catalog item), bonus rules editor.
3. **Design** — all theming options from §18; live card preview on the right.
4. **Screens** — enrollment and reward screen copy + imagery.

### 19.2 Live preview

- The preview is a non-interactive mock of the card showing the current settings.
- Changes update the preview in real time WITHOUT requiring save.
- Mobile viewport toggle (360px) and desktop (768px) preview sizes.

### 19.3 Save behavior

- A `hasChanges` flag is maintained.
- The Save button is disabled when no changes are pending.
- Save writes to `campaigns.config`, `loyalty_programs`, `campaign_rewards`, `campaign_bonus_rules` atomically (single RPC or transactional Edge Function call).
- On success: toast "Saved", reset `hasChanges`.
- On failure: toast with specific error; form state preserved.

### 19.4 Wizard mode

A first-time "build wizard" flow MUST guide new admins through: program type → threshold → reward → validation method → design → launch.

---

## 20. Member Management

### 20.1 List / search

- Full-text search across `name`, `email`, `phone`, `member_code` (case-insensitive).
- Filter by campaign (multi-select).
- Filter by status: active, locked, reward unlocked, birthday this month.
- Sort by: enrolled date, last activity, progress, total visits.
- Pagination: 50 per page with "load more".

### 20.2 Per-member actions

| Action | Description |
|--------|-------------|
| View activity | Opens MemberActivityModal with timeline of all `loyalty_progress_log` entries and `loyalty_redemptions`. |
| Open card | Opens the member's card in a new tab (admin-only URL with `impersonate=true`). |
| Reset progress | Zeros `current_progress`, logs `progress_reset`. Requires confirm dialog. |
| Unlock | Closes any open `validation_lockouts` row. |
| Revoke devices | Deletes all `loyalty_device_tokens` for the member. |
| Remove member | Hard deletes the `loyalty_accounts` row and cascades to progress log. Requires typed-confirm ("DELETE"). |

### 20.3 Exports

Two CSV exports:

- **Summary:** Name, Email, Phone, Program, Progress, Threshold, Total Visits, Status, Member Code, Enrolled At, Last Visit At.
- **Detailed:** Summary fields plus per-activity rows (timestamp, action_type, quantity, bonus_rule_name, validated_by) and per-redemption rows (short_code, reward_name, status, issued_at, expires_at, redeemed_at, source).

All CSV fields MUST be quoted to safely handle commas in names. UTF-8 BOM prepended for Excel compatibility.

---

## 21. Analytics and Reporting

### 21.1 Dashboard metrics (per campaign / brand)

- Total members (all time, new this period)
- Total visits (all time, this period)
- Rewards issued
- Rewards redeemed
- Redemption rate (redeemed / issued)
- Active bonus rules and hits per rule
- Birthday eligible members this month
- Average visits per member
- Chart: visits per day (rolling 30 / 60 / 90 days)
- Chart: funnel (enrolled → first visit → reward unlocked → reward redeemed)

### 21.2 Audit

Every state change on a member MUST appear in `loyalty_progress_log`. Entries are immutable. The log is retained indefinitely.

---

## 22. Security and RLS

All tables MUST have RLS enabled. No table may use `USING (true)`.

### 22.1 Key policies

- `loyalty_programs`: Read for anon (for public enrollment page rendering). Write for authenticated users belonging to the same client/brand.
- `loyalty_accounts`: Anonymous INSERT allowed for enrollment. Anonymous SELECT allowed only by `member_code + campaign_id` match via a SECURITY DEFINER RPC. Authenticated staff SELECT filtered by brand membership.
- `loyalty_progress_log`: INSERT via service role only (Edge Function). SELECT for authenticated staff filtered by brand.
- `loyalty_redemptions`: Same as above.
- `validation_attempts`: INSERT via service role only. SELECT for admins only.
- `validation_lockouts`: INSERT/UPDATE via service role. SELECT for authenticated staff filtered by brand; plus anonymous SELECT restricted to `loyalty_account_id` only when combined with a valid `device_token` match.
- `loyalty_device_tokens`: Service role only.

### 22.2 Secrets

Edge functions MUST pull `HUB_*` secrets from Supabase Edge Function secrets. Nothing Hub-related may be stored in client-readable columns.

### 22.3 JWT-based role checks

All `auth.uid()`-based policies MUST use `(select auth.uid())` pattern for query planner optimization (per Supabase RLS best practices).

---

## 23. Edge Function Contracts

### 23.1 `confirm-loyalty-action`

`POST /functions/v1/confirm-loyalty-action`

```json
// Request
{
  "memberCode": "ABC12345",
  "campaignId": "uuid",
  "actionType": "visit" | "redemption",
  "validation": { "method": "pin|icon_single|icon_sequence|icon_position", "payload": "..." },
  "tierId": "uuid | null",           // only for redemption
  "overrideCooldown": false,          // only when authenticated admin
  "deviceInfo": { "ua": "...", "platform": "..." }
}
```

**Visit response**
```json
{
  "success": true,
  "newProgress": 5,
  "threshold": 10,
  "rewardUnlocked": false,
  "stampValue": 2,
  "bonusApplied": true,
  "bonusRuleName": "Double Tuesdays",
  "unlockedTiers": []
}
```

**Redemption response**
```json
{
  "success": true,
  "shortCode": "XYZ123",
  "redemptionToken": "uuid",
  "redemptionUrl": "https://hub.../redeem/XYZ123?token=...",
  "newProgress": 0,
  "rewardName": "Free Coffee"
}
```

**Error codes**

| HTTP | Error code | Meaning |
|------|------------|---------|
| 400 | `reward_not_unlocked` | Redemption attempted before threshold |
| 401 | `invalid_validation` | Validation failed |
| 403 | `account_locked` | Lockout active |
| 403 | `campaign_paused` | Campaign not accepting new visits |
| 409 | `tier_not_unlocked` | Tier not currently eligible |
| 422 | `missing_fields` | Required fields absent |
| 429 | `cooldown_active` | Visit too soon; includes `retryAfter` timestamp |

### 23.2 `redeem-birthday-reward`

`POST /functions/v1/redeem-birthday-reward`

```json
{ "memberCode": "ABC12345", "campaignId": "uuid" }
```

### 23.3 `loyalty-device-token-lookup`

`POST /functions/v1/loyalty-device-token-lookup`

```json
{ "deviceToken": "uuid", "campaignSlug": "coffee-club" }
```

Returns the account if found and not expired, updates `last_used_at`.

### 23.4 CORS

Every edge function MUST include:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Client-Info, Apikey
```

And handle `OPTIONS` with HTTP 200.

---

## 24. Data Model Requirements

The following entities are required. Exact schema is derivable from the descriptions below — each table MUST have `id uuid primary key default gen_random_uuid()`, `created_at timestamptz default now()`, and appropriate FKs with `ON DELETE` behavior as noted.

### `clients`, `brands`, `profiles`
Identical to the Reward Hub's multi-tenant structure. Shared with the hub if co-located.

### `campaigns`
| Column | Type |
|--------|------|
| `id` | uuid pk |
| `client_id` | uuid FK |
| `brand_id` | uuid FK |
| `slug` | text unique |
| `status` | enum (draft/active/paused/archived) |
| `config` | jsonb (design, screens, etc.) |
| `starts_at`, `ends_at` | timestamptz |
| `timezone` | text |

### `loyalty_programs`
| Column | Type |
|--------|------|
| `id` | uuid pk |
| `campaign_id` | uuid unique FK (one program per campaign) |
| `program_type` | enum (visit/action) |
| `threshold` | int |
| `validation_method` | enum |
| `validation_config` | jsonb |
| `reward_name`, `reward_description` | text |
| `reward_catalog_id` | uuid (Hub catalog FK) |
| `reset_behavior` | enum (reset/rollover) |
| `lockout_threshold` | int default 3 |
| `cooldown_hours` | numeric default 0 |
| `birthday_reward_enabled` | bool default false |
| `birthday_reward_name` | text |
| `birthday_reward_catalog_id` | uuid |
| `expiry_days` | int default 30 |

### `campaign_rewards` (tiers)
`id, campaign_id, threshold, reward_catalog_id, name, description, sort_order, is_active`

### `campaign_bonus_rules`
`id, campaign_id, rule_type (day_of_week|time_window|custom_simple), rule_config jsonb, multiplier numeric, is_active`

### `loyalty_accounts`
`id, campaign_id, client_id, email, name, phone, birthday, current_progress int default 0, total_visits int default 0, reward_unlocked bool default false, reward_unlocked_at, member_code (unique per campaign), enrolled_at`

Unique constraint: `(campaign_id, email)`, `(campaign_id, member_code)`.

### `loyalty_progress_log`
`id, loyalty_account_id, campaign_id, action_type (visit_confirmed|reward_unlocked|reward_redeemed|progress_reset|bonus_applied), quantity int, bonus_rule_id (nullable FK), validated_by (nullable), device_info jsonb, created_at`

### `loyalty_redemptions`
`id, loyalty_account_id, campaign_id, hub_redemption_id uuid, short_code text, redemption_token uuid, reward_name text, status (valid/redeemed/expired), redemption_source (standard/birthday), tier_id (nullable), created_at, expires_at, redeemed_at (nullable)`

### `loyalty_device_tokens`
`id, loyalty_account_id, campaign_id, device_token uuid unique, device_name text, expires_at, last_used_at`

### `validation_attempts`
`id, loyalty_account_id, campaign_id, attempt_type (visit/redemption), validation_method, success bool, device_info jsonb, created_at`

### `validation_lockouts`
`id, loyalty_account_id, campaign_id, reason text, locked_at, unlocked_at (nullable), unlocked_by (nullable)`

### Indexes

At minimum:
- `loyalty_accounts(member_code, campaign_id)`
- `loyalty_accounts(campaign_id, email)`
- `loyalty_progress_log(loyalty_account_id, created_at desc)`
- `loyalty_redemptions(loyalty_account_id, created_at desc)`
- `loyalty_device_tokens(device_token)` with `expires_at` predicate
- `validation_lockouts(loyalty_account_id) WHERE unlocked_at IS NULL`

---

## 25. Non-Functional Requirements

### 25.1 Performance

| ID | Requirement |
|----|-------------|
| NFR-01 | Card page first paint < 1.5s p95 over 3G |
| NFR-02 | `confirm-loyalty-action` p95 < 700ms (visit), < 1.2s (redemption including Hub call) |
| NFR-03 | Admin dashboard initial load < 2s p95 |
| NFR-04 | Member search < 300ms p95 |

### 25.2 Availability

- 99.9% monthly uptime for enrollment and card pages.
- Planned maintenance MUST NOT block card viewing; only the "confirm visit" action may degrade to retry UI.

### 25.3 Accessibility

- All interactive elements keyboard-accessible.
- Color choices checked for WCAG AA contrast; warnings shown in the builder when failing.
- Validation challenges MUST be operable without relying on color alone.

### 25.4 Internationalization

- All user-facing strings MUST be externalized in a translation table for future localization.
- Dates and times formatted per the member's locale (browser-detected).
- Timezone handling per program setting for bonus-rule evaluation.

### 25.5 Observability

- Every edge function MUST log: request ID, caller, member code hash, outcome, duration.
- Error-level logs MUST include enough context to debug without needing the request body.
- Failed Hub calls MUST emit a distinct log with the Hub's response status.

---

## 26. Out of Scope

- Native iOS / Android apps (web-first; add-to-home-screen acceptable).
- POS integrations (the loyalty program is staff-validated, not POS-integrated in v1).
- SMS / push notifications (email-only v1).
- Points-based systems with variable per-transaction values (beyond what bonus multipliers cover).
- Referral flows (a future spoke of the hub).
- Federated identity (login with Google / Apple) — email/password is the only auth.
- Hub-side concerns: the loyalty spoke MUST NOT own redemption short-code generation, the public redemption page, or reward state transitions. Those are the Hub's responsibility.

---

## 27. Open Questions

| ID | Question |
|----|----------|
| OQ-01 | Should redemptions be cancel-able by staff (e.g., accidental redeem)? If so, does progress roll back? |
| OQ-02 | Should members see a history of their past redemptions on the card view, or only on an admin-facing page? |
| OQ-03 | Is there a minimum time between enrollment and the first eligible visit (fraud deterrent)? |
| OQ-04 | Should bonus rules stack, or does highest-multiplier-wins remain the rule? |
| OQ-05 | For members with no email, should birthday rewards be available at all? |
| OQ-06 | How are archived campaigns handled — are the members retained, anonymized, or purged? |

---

## Appendix A: Icon Library

The following icon keys MUST be supported for stamp icons and icon-based validation. Icons are sourced from `react-icons` (FontAwesome 6 set) or equivalent. Custom icons supported via URL.

`heart`, `star`, `award`, `coffee`, `wine`, `pizza`, `gift`, `music`, `sun`, `moon`, `cloud`, `droplet`, `feather`, `anchor`, `zap`, `umbrella`, `shopping`, `camera`, `leaf`

---

## Appendix B: Reference User Flows

### B.1 New Member First Visit

1. Customer scans QR at counter → lands on `/loyalty/{slug}` enrollment page.
2. Fills out form, checks "Remember this device".
3. Submits → receives unique `member_code`, gets device token, redirected to `/loyalty/{slug}/card`.
4. Card displays with 0 filled stamps.
5. Customer shows card to staff, taps "Confirm Visit".
6. StaffValidationModal opens. Staff enters PIN (or completes icon challenge).
7. On success, edge function increments progress, logs the visit, returns new state.
8. Card animates first stamp filling in. Progress: `1 / 10`.

### B.2 Returning Member (Device Recognized)

1. Customer scans QR → lands on `/loyalty/{slug}`.
2. Page reads localStorage, finds valid device token.
3. Edge function validates token, returns account.
4. Redirects directly to card view. Enrollment skipped.

### B.3 Reward Redemption

1. Member has `reward_unlocked = true` (10 / 10 stamps).
2. Taps "Redeem Your Reward".
3. Optionally chooses tier (if multi-tier).
4. StaffValidationModal opens. Staff validates.
5. Edge function calls Hub's `POST /api/v1/redemptions/issue`.
6. Hub returns short code, token, URL.
7. Loyalty spoke inserts `loyalty_redemptions`, updates progress (reset or rollover).
8. Member redirected to Hub's public redemption page.
9. Cashier taps "Mark as Redeemed" on Hub's page.
10. Hub webhook fires back to spoke → spoke updates `status = redeemed`, `redeemed_at = now()`.

### B.4 Lockout and Manager Override

1. Staff fails validation 3 times in a row.
2. System inserts `validation_lockouts` row.
3. Card shows "Account Locked" state.
4. Manager taps "Manager Override" (visible only to staff-authenticated sessions).
5. Enters manager PIN. On correct PIN, lockout row updated (`unlocked_at`, `unlocked_by`).
6. Card returns to normal state. Failed attempt counter reset.

### B.5 Birthday Reward

1. On card load, system checks birthday eligibility (same UTC month, not already claimed).
2. "Claim Birthday Reward" CTA appears alongside the normal stamp grid.
3. Member taps it. No validation needed.
4. Edge function calls Hub with `redemption_source = birthday`.
5. Member redirected to Hub redemption page.
6. The CTA disappears; will reappear next birthday month.

---

**End of Document.**
