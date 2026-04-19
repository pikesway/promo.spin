# Product Requirements Document: Standalone Reward System

**Document Version:** 1.0
**Date:** 2026-04-19
**Status:** Draft
**Prepared by:** Lead System Analyst

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Goals and Success Metrics](#3-goals-and-success-metrics)
4. [System Overview: Hub and Spoke Model](#4-system-overview-hub-and-spoke-model)
5. [User Personas and Roles](#5-user-personas-and-roles)
6. [Functional Requirements](#6-functional-requirements)
7. [Reward Catalog](#7-reward-catalog)
8. [Redemption Flow](#8-redemption-flow)
9. [Validation and Security Requirements](#9-validation-and-security-requirements)
10. [Spoke Integration Requirements (Webhook API)](#10-spoke-integration-requirements-webhook-api)
11. [Admin and Management Requirements](#11-admin-and-management-requirements)
12. [Notification Requirements](#12-notification-requirements)
13. [Analytics and Reporting Requirements](#13-analytics-and-reporting-requirements)
14. [Non-Functional Requirements](#14-non-functional-requirements)
15. [Data Model Requirements](#15-data-model-requirements)
16. [Out of Scope](#16-out-of-scope)
17. [Open Questions](#17-open-questions)

---

## 1. Executive Summary

This document defines the product requirements for a **Standalone Reward System** — a central hub application that manages reward catalogs, redemption codes, validation workflows, and reporting across one or more connected loyalty (or other engagement) applications.

The system is designed under a **hub-and-spoke architecture**. The hub owns all reward definitions, redemption state, and audit history. Connected spoke applications (such as a digital loyalty card program, a trivia game, a spin-to-win campaign, etc.) trigger reward events via a defined webhook/API contract. The hub processes those events, generates redemption codes, and provides a unified interface for staff to mark rewards as claimed.

The immediate use case migrates the reward and redemption subsystem currently embedded inside the loyalty program application into this standalone hub, allowing the loyalty program to become the first spoke.

---

## 2. Problem Statement

The current reward and redemption system is tightly coupled to the loyalty card program. This creates the following problems:

- **No reuse:** Any new engagement application (games, trivia, referrals) that needs to issue rewards must duplicate redemption logic.
- **Fragmented reporting:** Reward redemptions across different campaign types cannot be viewed or managed from a single location.
- **Maintenance burden:** Changes to redemption logic (code expiry, validation methods, email templates) must be made in every coupled application.
- **Scaling limits:** Adding new spoke applications or new reward types requires touching the loyalty application codebase.

The Standalone Reward System solves all of these by owning all reward and redemption concerns centrally, exposing a clean API for spoke applications to trigger reward events.

---

## 3. Goals and Success Metrics

### Goals

| ID | Goal |
|----|------|
| G1 | Reward catalog management lives in one system, shared across all spokes |
| G2 | Staff can mark any reward as redeemed from a single interface |
| G3 | Spoke applications integrate via a documented API without sharing code |
| G4 | Every reward event is audited with full context |
| G5 | The system supports the existing multi-client, multi-brand hierarchy |

### Success Metrics

| Metric | Target |
|--------|--------|
| Time to onboard a new spoke | Under 1 day of integration work |
| Reward redemption code lookup time | Under 200ms p99 |
| Audit log completeness | 100% of state changes logged |
| Invalid redemption attempt rate | Tracked and alertable |

---

## 4. System Overview: Hub and Spoke Model

```
┌─────────────────────────────────────────────────────────────┐
│                        REWARD HUB                           │
│                                                             │
│  ┌─────────────────┐   ┌──────────────┐   ┌────────────┐  │
│  │  Reward Catalog  │   │  Redemptions  │   │  Analytics │  │
│  │  Management      │   │  & Audit Log  │   │  & Reports │  │
│  └─────────────────┘   └──────────────┘   └────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Spoke Webhook / API Gateway              │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │  Webhook Events / REST API
          ┌─────────────────┼─────────────────────────────┐
          │                 │                              │
┌─────────▼──────┐  ┌───────▼───────┐           ┌────────▼────────┐
│ Loyalty Card   │  │  Trivia Game  │           │  Future Spoke   │
│    (Spoke 1)   │  │   (Spoke 2)   │           │   Application   │
└────────────────┘  └───────────────┘           └─────────────────┘
```

### Hub Responsibilities

- Define and manage reward catalogs per client and brand
- Receive reward trigger events from spokes
- Generate unique redemption codes (short codes + secure tokens)
- Track redemption state (valid → redeemed → expired)
- Provide staff-facing redemption verification interface
- Send reward notification emails
- Provide full redemption audit log

### Spoke Responsibilities

- Manage their own engagement logic (stamp collection, game play, etc.)
- Determine when a member has earned a reward
- Call the hub's API to request a redemption code
- Display the redemption code to the end user
- Optionally display a deep-link to the hub's public redemption page

### Key Boundary

The hub does **not** know what rules govern earning a reward. That is entirely up to the spoke. The hub only needs to know: a reward has been earned, here is the context, please issue a code.

---

## 5. User Personas and Roles

### 5.1 System Roles

| Role | Description |
|------|-------------|
| **Platform Admin** | Top-level operator. Can manage all clients, configure system-wide settings, and view all data. Maps to the Agency Admin role in the current system. |
| **Client Admin** | Manages one or more brands under their client account. Configures reward catalogs, views reports, manages staff. |
| **Brand Manager** | Manages configuration and reporting for a specific brand. May be granted permissions by a Client Admin. |
| **Staff / Cashier** | Looks up redemption codes on the staff interface and marks rewards as claimed. No access to configuration. |
| **End User / Member** | Earns rewards through spoke applications. Views their redemption code. Cannot access admin features. |

### 5.2 Persona Descriptions

**Platform Admin**
Operates the hub SaaS platform on behalf of all clients. Creates new client accounts, sets limits, and can impersonate any client for support purposes.

**Client Admin**
A business owner or marketing manager running the loyalty/rewards program for their company. Configures what rewards are available, how they look, and who can manage them.

**Staff / Cashier**
The on-the-ground employee who confirms that a customer has received their reward. Needs a simple, fast interface to look up a code and tap "Mark as Redeemed." Must not be able to change any configuration.

**End User / Member**
A customer of the business who has earned a reward through a spoke application. They navigate to the redemption page (usually via a QR code or link), show the code to the cashier, and the cashier confirms it.

---

## 6. Functional Requirements

### 6.1 Reward Issuance (Hub API)

| ID | Requirement |
|----|-------------|
| FR-01 | The hub MUST expose an authenticated REST endpoint that a spoke can call to request a redemption code |
| FR-02 | The endpoint MUST accept: spoke identifier, member identifier (from spoke's context), reward catalog item ID, optional metadata bag |
| FR-03 | The hub MUST validate that the spoke is registered and active |
| FR-04 | The hub MUST validate that the reward catalog item belongs to the same client as the spoke |
| FR-05 | On valid request, the hub MUST generate a unique short code (6 alphanumeric characters, unambiguous set) and a secure token (UUID) |
| FR-06 | The hub MUST store the issued redemption with status `valid` |
| FR-07 | The hub MUST return the short code, secure token, expiry timestamp, and a fully-formed redemption URL to the spoke |
| FR-08 | The hub MUST support configurable expiry durations per reward catalog item (default 30 days) |
| FR-09 | The hub MUST emit an async notification (email) to the member when a reward is issued, if an email address is provided |

### 6.2 Redemption Claiming (Staff Interface)

| ID | Requirement |
|----|-------------|
| FR-10 | The hub MUST provide a public URL per redemption (e.g., `/redeem/{shortCode}?token={token}`) viewable without authentication |
| FR-11 | The redemption page MUST display: reward name, short code in large text, brand/client branding, validity status, and time remaining |
| FR-12 | The redemption page MUST show a "Mark as Redeemed" button when status is `valid` |
| FR-13 | Confirming "Mark as Redeemed" MUST require a confirmation step (modal or double-confirm) before executing |
| FR-14 | The hub MUST accept: short code + secure token as dual verification before marking as redeemed |
| FR-15 | Once marked as redeemed, status MUST change to `redeemed` permanently (no undo) |
| FR-16 | The redemption page MUST display an expired state clearly when the redemption has passed its expiry date |
| FR-17 | The redemption page MUST display an already-redeemed state with the time of redemption when status is `redeemed` |
| FR-18 | The hub MUST apply the client's branding (logo, primary color, name) to the redemption page |

### 6.3 Redemption Lookup (Staff Dashboard)

| ID | Requirement |
|----|-------------|
| FR-19 | Authenticated staff MUST be able to search for a redemption by short code from the admin dashboard |
| FR-20 | The search result MUST show: member info (from spoke metadata), reward name, issued timestamp, status, expiry |
| FR-21 | Authenticated staff MUST be able to mark a redemption as redeemed from the dashboard (not only from the public URL) |
| FR-22 | The dashboard MUST show the full redemption log for a brand with filters by status, date range, and spoke |

### 6.4 Expiry Management

| ID | Requirement |
|----|-------------|
| FR-23 | Redemptions past their `expires_at` timestamp MUST be treated as `expired` on read, even if their stored status is still `valid` |
| FR-24 | A scheduled process MUST bulk-update expired redemptions to status `expired` at least once daily |
| FR-25 | Expired redemptions MUST NOT be markable as redeemed |

---

## 7. Reward Catalog

### 7.1 Catalog Structure

| ID | Requirement |
|----|-------------|
| RC-01 | Each client MUST have a reward catalog containing one or more reward items |
| RC-02 | Reward items MUST be scoped to a brand within a client hierarchy |
| RC-03 | A reward item MUST include: name, description (optional), type, value (optional), expiry duration (days), active flag, and sort order |
| RC-04 | Reward types MUST include at minimum: `free_item`, `discount`, `vip_access`, `birthday`, `custom` |
| RC-05 | Reward items MUST be activatable/deactivatable without deletion to preserve historical references |
| RC-06 | The catalog MUST support ordering reward items for display purposes |

### 7.2 Catalog Management

| ID | Requirement |
|----|-------------|
| RC-07 | Client Admins MUST be able to create, edit, activate/deactivate, and reorder reward items |
| RC-08 | The hub MUST prevent deletion of a reward item that has been referenced by any issued redemption |
| RC-09 | Spoke applications MUST reference a reward item by its hub-issued catalog ID when requesting a redemption code |

### 7.3 Multi-Tier Rewards (Optional Configuration)

| ID | Requirement |
|----|-------------|
| RC-10 | A reward program MAY configure multiple tiers with different reward items |
| RC-11 | Tier thresholds are managed by the spoke application; the hub only stores the reward item, not the threshold |
| RC-12 | The spoke passes the applicable reward catalog item ID when a threshold is crossed |

---

## 8. Redemption Flow

### 8.1 States

```
ISSUED (valid)
    │
    ├─── Mark as Redeemed ──► REDEEMED (terminal)
    │
    └─── Expires ───────────► EXPIRED (terminal)
```

| State | Description |
|-------|-------------|
| `valid` | Issued and not yet used or expired |
| `redeemed` | Used by staff or cashier |
| `expired` | Past the configured expiry date |

### 8.2 Full Flow Narrative

**Step 1 — Spoke triggers a reward event**
The spoke application determines a member has earned a reward (e.g., loyalty stamp threshold reached). The spoke calls the hub's `POST /api/v1/redemptions/issue` endpoint, passing its API key, the member's identifier and contact info, and the hub reward catalog item ID.

**Step 2 — Hub validates and issues a code**
The hub verifies the spoke's API key and that the catalog item is active and belongs to the correct client. It generates a 6-character short code and a UUID token, stores the redemption as `valid`, and returns the short code, token, expiry, and a pre-built redemption URL.

**Step 3 — Spoke delivers the code to the member**
The spoke displays the short code and/or redemption URL to the member (e.g., on a loyalty card screen). The spoke may also display a QR code that encodes the redemption URL.

**Step 4 — Member presents at point of redemption**
The member navigates to the redemption URL (or shows the QR code). The hub's public redemption page loads, shows the coupon with branding, and displays "Mark as Redeemed."

**Step 5 — Staff confirms redemption**
The staff member (cashier) taps "Mark as Redeemed," confirms via a dialog, and the hub marks the redemption as `redeemed` with a timestamp.

**Step 6 — Notification sent**
The hub optionally sends a confirmation notification to the member.

### 8.3 Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Code already redeemed | Show "Already Redeemed" state with redemption timestamp |
| Code expired | Show "Expired" state with expiry date |
| Invalid token (URL tampered) | Return 403, show generic error |
| Short code not found | Return 404, show generic error |
| Network failure during marking | Return 500, allow retry |
| Staff marks same code twice | Second attempt fails gracefully, shows "Already Redeemed" |

---

## 9. Validation and Security Requirements

### 9.1 Redemption Security Model

| ID | Requirement |
|----|-------------|
| SEC-01 | Every redemption URL MUST contain both the short code (public) and a UUID token (secret) |
| SEC-02 | The mark-as-redeemed action MUST verify both the short code AND token match the same record |
| SEC-03 | Short codes MUST use an unambiguous character set (A-Z, 2-9, excluding 0, O, 1, I) to avoid visual confusion |
| SEC-04 | Tokens MUST be cryptographically random UUIDs |
| SEC-05 | The mark-as-redeemed endpoint MUST be rate-limited to prevent brute-force scanning |
| SEC-06 | Redemption records MUST be immutable after reaching a terminal state (`redeemed` or `expired`) |

### 9.2 Spoke API Security

| ID | Requirement |
|----|-------------|
| SEC-07 | Each registered spoke MUST have a unique API key for authenticating calls to the hub |
| SEC-08 | Spoke API keys MUST be rotatable by the Client Admin without system downtime |
| SEC-09 | Spoke API key usage MUST be logged (timestamp, spoke ID, action, response code) |
| SEC-10 | The hub MUST reject any reward issuance request where the spoke's API key is revoked or inactive |
| SEC-11 | All hub API traffic MUST be over HTTPS |

### 9.3 Staff Access Security

| ID | Requirement |
|----|-------------|
| SEC-12 | Staff users MUST authenticate with email/password before accessing the staff dashboard |
| SEC-13 | Staff MUST only see redemptions for brands they are explicitly permitted to manage |
| SEC-14 | Staff MUST NOT have access to reward catalog configuration |
| SEC-15 | All admin actions (marking redeemed, searching) MUST be logged with the authenticated user's identity |

---

## 10. Spoke Integration Requirements (Webhook API)

### 10.1 Spoke Registration

| ID | Requirement |
|----|-------------|
| INT-01 | A spoke application MUST be registered in the hub by a Client Admin before it can issue rewards |
| INT-02 | Registration requires: spoke name, description, client and brand assignment, and generates an API key |
| INT-03 | Multiple spokes can be registered per brand |

### 10.2 Reward Issuance Endpoint

**Endpoint:** `POST /api/v1/redemptions/issue`

**Authentication:** Bearer token (spoke API key) in Authorization header

**Request Body:**

```json
{
  "reward_catalog_id": "uuid",
  "member": {
    "external_id": "string (spoke's member identifier)",
    "name": "string (optional)",
    "email": "string (optional, for notification)",
    "phone": "string (optional)"
  },
  "metadata": {
    "source": "loyalty_card",
    "spoke_campaign_id": "string (optional)",
    "custom_key": "any (optional extra context)"
  }
}
```

**Success Response (200):**

```json
{
  "redemption_id": "uuid",
  "short_code": "ABC123",
  "token": "uuid",
  "redemption_url": "https://rewards.example.com/redeem/ABC123?token=uuid",
  "reward_name": "Free Coffee",
  "expires_at": "2026-05-19T15:32:00Z",
  "issued_at": "2026-04-19T15:32:00Z"
}
```

**Error Responses:**

| HTTP Code | Scenario |
|-----------|----------|
| 401 | Invalid or missing API key |
| 403 | Spoke inactive or revoked |
| 404 | Reward catalog item not found or inactive |
| 422 | Missing required fields in request |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

### 10.3 Webhook Notifications (Hub → Spoke, Optional)

The hub MAY emit events to a spoke-registered webhook URL when redemption state changes.

**Event Types:**

| Event | Trigger |
|-------|---------|
| `redemption.issued` | A redemption code is generated |
| `redemption.redeemed` | A redemption is marked as claimed |
| `redemption.expired` | A redemption passes its expiry |

**Webhook Payload:**

```json
{
  "event": "redemption.redeemed",
  "redemption_id": "uuid",
  "short_code": "ABC123",
  "spoke_id": "uuid",
  "member_external_id": "string",
  "reward_name": "Free Coffee",
  "occurred_at": "2026-04-19T15:32:00Z"
}
```

**Spoke Webhook Requirements:**

| ID | Requirement |
|----|-------------|
| INT-04 | Spoke MAY register a webhook URL for state-change notifications |
| INT-05 | Hub MUST sign webhook payloads with HMAC-SHA256 using a shared secret |
| INT-06 | Hub MUST retry failed webhook deliveries up to 3 times with exponential backoff |
| INT-07 | Hub MUST log all webhook delivery attempts and outcomes |

---

## 11. Admin and Management Requirements

### 11.1 Client and Brand Management

| ID | Requirement |
|----|-------------|
| ADM-01 | Platform Admin MUST be able to create, edit, and deactivate client accounts |
| ADM-02 | Client Admins MUST be able to create and manage brands under their client |
| ADM-03 | Each brand MUST have configurable branding: logo, primary color, business name |
| ADM-04 | Client Admins MUST be able to invite and manage staff users with brand-level permissions |

### 11.2 Spoke Management

| ID | Requirement |
|----|-------------|
| ADM-05 | Client Admins MUST be able to register and manage spoke applications |
| ADM-06 | Client Admins MUST be able to view the API key for each spoke and rotate it |
| ADM-07 | Each spoke MUST be assignable to one or more brands |
| ADM-08 | Client Admins MUST be able to temporarily suspend a spoke without deleting it |

### 11.3 Reward Catalog Management

| ID | Requirement |
|----|-------------|
| ADM-09 | Client Admins MUST be able to create reward items in the catalog (name, type, description, value, expiry) |
| ADM-10 | Client Admins MUST be able to edit inactive reward items |
| ADM-11 | Active reward items with issued redemptions MUST NOT be fully deletable (soft delete only) |
| ADM-12 | Client Admins MUST be able to reorder catalog items |

### 11.4 Staff Dashboard

| ID | Requirement |
|----|-------------|
| ADM-13 | Staff users MUST have access to a dashboard showing recent redemptions for their permitted brands |
| ADM-14 | The dashboard MUST support searching by short code and filtering by status and date range |
| ADM-15 | The dashboard MUST allow staff to manually mark a redemption as redeemed (in case the public URL is unavailable) |
| ADM-16 | The dashboard MUST display member info attached to the redemption (name, email from metadata) |

---

## 12. Notification Requirements

### 12.1 Email Notifications

| ID | Requirement |
|----|-------------|
| NOT-01 | When a redemption is issued, the hub MUST send an email to the member (if email provided) |
| NOT-02 | The email MUST contain: reward name, short code, redemption URL (with QR code), expiry date |
| NOT-03 | The email MUST use the client's branding (logo, name, primary color) |
| NOT-04 | Email delivery MUST be asynchronous (not blocking the reward issuance response) |
| NOT-05 | Email delivery status MUST be tracked per redemption (pending, sent, failed) |
| NOT-06 | Failed emails MUST be retried at least once before marking as failed |

### 12.2 Future Notification Channels

SMS and push notifications are out of scope for v1 but the notification system should be designed to support additional channels without schema changes.

---

## 13. Analytics and Reporting Requirements

### 13.1 Dashboard Metrics

| ID | Requirement |
|----|-------------|
| ANA-01 | Client Admins MUST be able to view total redemptions issued, redeemed, and expired per brand |
| ANA-02 | Metrics MUST be filterable by date range and spoke |
| ANA-03 | The dashboard MUST show a redemption rate (redeemed / issued) |
| ANA-04 | The dashboard MUST show average time from issuance to redemption |
| ANA-05 | Data MUST be presented visually (charts) alongside tabular data |

### 13.2 Audit Log

| ID | Requirement |
|----|-------------|
| ANA-06 | Every state change on a redemption MUST be logged with: actor, timestamp, previous state, new state |
| ANA-07 | The audit log MUST be viewable per redemption and per brand |
| ANA-08 | Audit logs MUST be retained indefinitely (no auto-deletion) |

### 13.3 Export

| ID | Requirement |
|----|-------------|
| ANA-09 | Client Admins MUST be able to export redemption data as CSV |
| ANA-10 | Export MUST include: short code, reward name, member info, issued at, redeemed at, status, spoke name |

---

## 14. Non-Functional Requirements

### 14.1 Performance

| ID | Requirement |
|----|-------------|
| NFR-01 | Reward issuance (API response) MUST complete in under 500ms p95 |
| NFR-02 | Redemption page load MUST complete in under 1 second p95 |
| NFR-03 | Mark-as-redeemed action MUST complete in under 300ms p95 |
| NFR-04 | Admin dashboard initial load MUST complete in under 2 seconds p95 |

### 14.2 Availability

| ID | Requirement |
|----|-------------|
| NFR-05 | The system MUST target 99.9% monthly uptime for the reward issuance API and redemption page |
| NFR-06 | Maintenance windows MUST NOT prevent members from viewing already-issued redemption pages |

### 14.3 Security

| ID | Requirement |
|----|-------------|
| NFR-07 | All personally identifiable information (PII) MUST be stored encrypted at rest |
| NFR-08 | The system MUST enforce Row Level Security at the database layer for all multi-tenant data |
| NFR-09 | Secrets (API keys, tokens) MUST NOT be logged in plain text |
| NFR-10 | The system MUST support audit trails for all privileged operations |

### 14.4 Scalability

| ID | Requirement |
|----|-------------|
| NFR-11 | The system MUST support horizontal scaling of the API layer |
| NFR-12 | The database schema MUST support at least 10 million redemption records without degradation |
| NFR-13 | Analytics queries MUST use pre-computed caches for large datasets to avoid on-demand table scans |

### 14.5 Extensibility

| ID | Requirement |
|----|-------------|
| NFR-14 | The spoke API contract MUST be versioned (e.g., `/api/v1/`) to allow non-breaking evolution |
| NFR-15 | New spoke types MUST be onboardable without changes to hub core logic |
| NFR-16 | New reward types MUST be addable as catalog item type enumeration values |

---

## 15. Data Model Requirements

The following entities and their relationships are required. Detailed schema is covered in the Architecture Document.

| Entity | Purpose |
|--------|---------|
| `clients` | Top-level organizational accounts |
| `brands` | Sub-organizations within a client |
| `profiles` | Users with role and brand permissions |
| `spoke_registrations` | Registered spoke applications with API keys |
| `reward_catalog_items` | Configurable reward definitions per brand |
| `redemptions` | Issued redemption codes and their state |
| `redemption_events` | Immutable audit log of all state changes |
| `spoke_webhook_deliveries` | Log of outbound webhook delivery attempts |
| `notification_log` | Email/notification delivery tracking |

---

## 16. Out of Scope

The following are explicitly not part of this application:

- **Stamp / visit tracking** — This is the responsibility of each spoke application (e.g., the loyalty card spoke)
- **Game logic** — Any trivia, spin, or scratch game mechanics are owned by their respective spoke
- **Membership enrollment** — Spoke applications manage their own member enrollment
- **Reward earning rules** — The hub does not define when a reward is earned; spokes determine eligibility
- **Birthday tracking** — If a spoke wants to issue birthday rewards, it handles birthday logic and calls the hub's issue endpoint
- **Loyalty card display** — The visual digital loyalty card lives in the spoke application
- **POS integration** — Direct integration with point-of-sale systems is out of scope for v1

---

## 17. Open Questions

| ID | Question | Owner |
|----|----------|-------|
| OQ-01 | Should the hub support multiple brands sharing a single reward catalog, or is the catalog always brand-scoped? | Product |
| OQ-02 | Is there a requirement to allow members to view all their rewards (across spokes) in one place within the hub? | Product |
| OQ-03 | What is the acceptable rate limit for the spoke issuance API (calls per minute per spoke)? | Engineering |
| OQ-04 | Should the hub support physical QR-code printed materials that link to a redemption (with no token for security)? | Product |
| OQ-05 | Is HMAC-based webhook verification sufficient, or do spokes need mutual TLS? | Engineering / Security |
| OQ-06 | Should the hub emit real-time events (WebSocket/SSE) to the admin dashboard for live redemption feeds? | Product |
| OQ-07 | What is the data retention policy for redemption records and audit logs? | Legal / Compliance |
