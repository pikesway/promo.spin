# Loyalty Program System Documentation

## Overview

The Loyalty Program System is a digital stamp card solution that allows businesses to create and manage customer loyalty programs. Customers earn stamps through visits or purchases, and redeem rewards when they reach a threshold.

## System Architecture

```
+------------------+     +-------------------+     +------------------+
|                  |     |                   |     |                  |
|  Admin Builder   +---->+  Supabase DB      +---->+  Customer App    |
|  (Configure)     |     |  (Store Data)     |     |  (Use Card)      |
|                  |     |                   |     |                  |
+------------------+     +--------+----------+     +------------------+
                                  |
                                  v
                         +------------------+
                         |                  |
                         |  Edge Functions  |
                         |  (Process Actions)|
                         |                  |
                         +------------------+
```

## File Structure

### Pages

| File | Purpose |
|------|---------|
| `src/pages/LoyaltyEnrollmentPage.jsx` | Customer enrollment form - collects name, email, phone |
| `src/pages/LoyaltyCardPage.jsx` | Digital stamp card view with QR code and action buttons |

### Admin Components

| File | Purpose |
|------|---------|
| `src/components/admin/LoyaltyProgramBuilder.jsx` | Main builder interface with tabs |
| `src/components/admin/LoyaltyMemberManagement.jsx` | Member list, stats, search, and CSV export |
| `src/components/admin/MemberActivityModal.jsx` | Detailed member view with activity log and rewards |

### Builder Sub-Components

| File | Purpose |
|------|---------|
| `src/components/admin/builder/LoyaltySettings.jsx` | Program config: name, threshold, validation, scheduling |
| `src/components/admin/builder/LoyaltyDesign.jsx` | Card visual customization: colors, icons, layout |
| `src/components/admin/builder/LoyaltyScreens.jsx` | Enrollment and reward screen text customization |
| `src/components/admin/builder/LoyaltyPreview.jsx` | Live preview of the loyalty card |

### Validation Components

| File | Purpose |
|------|---------|
| `src/components/loyalty/StaffValidationModal.jsx` | Container modal that renders appropriate validation |
| `src/components/loyalty/PinValidation.jsx` | 4-6 digit PIN entry validation |
| `src/components/loyalty/IconGridValidation.jsx` | Select correct icon from a grid |
| `src/components/loyalty/IconSequenceValidation.jsx` | Tap icons in correct sequence |
| `src/components/loyalty/IconPositionValidation.jsx` | Identify icon at specific position |
| `src/components/loyalty/ManagerOverrideModal.jsx` | Manager PIN to unlock locked accounts |

### Supporting Files

| File | Purpose |
|------|---------|
| `src/constants/loyaltyIcons.js` | Icon library for stamps and validation |
| `src/utils/campaignAdapter.js` | Normalizes campaign config for different formats |

### Edge Functions

| File | Purpose |
|------|---------|
| `supabase/functions/confirm-loyalty-action/index.ts` | Processes visits and redemptions server-side |

## Database Schema

### Tables

#### `loyalty_programs`
Configuration for each loyalty program.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `campaign_id` | uuid | FK to campaigns |
| `program_type` | text | 'visit' or 'action' |
| `threshold` | integer | Stamps required (1-100) |
| `validation_method` | text | 'pin', 'icon_single', 'icon_sequence', 'icon_position' |
| `validation_config` | jsonb | Method-specific settings |
| `reward_name` | text | Name of reward |
| `reward_description` | text | Description |
| `reset_behavior` | text | 'reset' or 'rollover' |
| `lockout_threshold` | integer | Failed attempts before lockout |

#### `loyalty_accounts`
Customer membership records.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `campaign_id` | uuid | FK to campaigns |
| `client_id` | uuid | FK to clients |
| `email` | text | Customer email (unique per campaign) |
| `name` | text | Customer name |
| `phone` | text | Optional phone |
| `current_progress` | integer | Current stamp count |
| `total_visits` | integer | Lifetime visits |
| `reward_unlocked` | boolean | Whether reward is ready |
| `reward_unlocked_at` | timestamptz | When reward became available |
| `member_code` | text | Unique 8-char code for QR |
| `enrolled_at` | timestamptz | Enrollment date |

#### `loyalty_progress_log`
Audit trail of all actions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `loyalty_account_id` | uuid | FK to loyalty_accounts |
| `campaign_id` | uuid | FK to campaigns |
| `action_type` | text | 'visit_confirmed', 'reward_unlocked', 'reward_redeemed', 'progress_reset' |
| `quantity` | integer | Stamps added (usually 1) |
| `validated_by` | uuid | Staff user who validated |
| `device_info` | jsonb | Device metadata |
| `created_at` | timestamptz | Action timestamp |

#### `loyalty_redemptions`
Reward redemption records.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `loyalty_account_id` | uuid | FK to loyalty_accounts |
| `campaign_id` | uuid | FK to campaigns |
| `redemption_id` | uuid | FK to main redemptions table |
| `short_code` | text | 6-char redemption code |
| `status` | text | 'valid', 'redeemed', 'expired' |
| `created_at` | timestamptz | Issue date |
| `expires_at` | timestamptz | Expiration date |

#### `loyalty_device_tokens`
Remembered devices for auto-login.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `loyalty_account_id` | uuid | FK to loyalty_accounts |
| `campaign_id` | uuid | FK to campaigns |
| `device_token` | text | UUID stored in localStorage |
| `device_name` | text | 'iPhone', 'Android', etc. |
| `expires_at` | timestamptz | Token expiration (60 days) |
| `last_used_at` | timestamptz | Last access time |

#### `validation_attempts`
Track validation for security.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `loyalty_account_id` | uuid | FK to loyalty_accounts |
| `attempt_type` | text | 'visit' or 'redemption' |
| `success` | boolean | Whether attempt succeeded |
| `device_info` | jsonb | Device metadata |
| `created_at` | timestamptz | Attempt timestamp |

#### `validation_lockouts`
Locked accounts requiring manager override.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `loyalty_account_id` | uuid | FK to loyalty_accounts |
| `reason` | text | Lockout reason |
| `locked_at` | timestamptz | When locked |
| `unlocked_at` | timestamptz | When unlocked (null if still locked) |
| `unlocked_by` | uuid | Manager who unlocked |

## User Flows

### Customer Enrollment Flow

```
1. Customer scans QR code or visits enrollment URL
2. LoyaltyEnrollmentPage checks for existing device token
   - If found and valid, redirects to LoyaltyCardPage
3. Customer fills out enrollment form (name, email, optional phone)
4. System creates loyalty_account with unique member_code
5. If "Remember Device" checked, creates device_token in localStorage
6. Redirects to LoyaltyCardPage
```

### Visit Confirmation Flow

```
1. Customer shows digital card to staff
2. Customer taps "Confirm Visit" button
3. StaffValidationModal opens with configured validation method
4. Staff enters PIN or completes icon challenge
5. On success:
   - current_progress increments
   - total_visits increments
   - Entry added to loyalty_progress_log
   - If threshold reached, reward_unlocked = true
6. Card UI updates with animation
```

### Reward Redemption Flow

```
1. Customer has reward_unlocked = true
2. Customer taps "Redeem Your Reward"
3. StaffValidationModal opens for redemption validation
4. On success:
   - Edge function creates redemption record
   - Creates loyalty_redemption with short_code
   - Resets or rolls over progress based on config
   - Logs 'reward_redeemed' action
   - Sends redemption email
5. Redirects to RedemptionPage with coupon code
```

### Account Lockout Flow

```
1. Customer/staff fails validation X times (configurable)
2. System creates validation_lockout record
3. Card shows "Account Locked" message
4. Manager opens ManagerOverrideModal
5. Manager enters override PIN
6. System sets unlocked_at on lockout record
7. Customer can continue using card
```

## Configuration Options

### Program Types

| Type | Description | Use Case |
|------|-------------|----------|
| `visit` | Earn one stamp per visit | Coffee shops, restaurants |
| `action` | Earn stamps per purchase | Retail, services |

### Validation Methods

| Method | Description | Security Level |
|--------|-------------|----------------|
| `pin` | 4-6 digit PIN code | Low |
| `icon_single` | Select one correct icon | Medium |
| `icon_sequence` | Tap 3+ icons in order | High |
| `icon_position` | Identify icon at position | Medium |

### Reset Behaviors

| Behavior | Description |
|----------|-------------|
| `reset` | Progress goes to 0 after redemption |
| `rollover` | Excess stamps carry over to next card |

### Card Design Options

| Option | Description |
|--------|-------------|
| `primaryColor` | Main brand color |
| `backgroundColor` | Card background |
| `stampIcon` | Icon for filled stamps (18 options + custom) |
| `customIconUrl` | URL for custom stamp icon |
| `layout` | Grid layout configuration |
| `showLogo` | Display client logo |
| `showQR` | Display QR code on card |

## Available Stamp Icons

From `src/constants/loyaltyIcons.js`:

- heart, star, award, coffee, wine, pizza
- gift, music, sun, moon, cloud, droplet
- feather, anchor, zap, umbrella, shopping, camera

Custom icons supported via URL.

## Admin Features

### Member Management

- Search by name, email, phone, or member code
- Filter by loyalty program
- View member progress and stats
- Reset individual member progress
- Remove members from program
- View detailed activity modal

### Export Options

1. **Summary Export**: Basic member info
   - Name, Email, Phone, Program, Progress, Total Visits, Status, Member Code, Enrolled Date

2. **Detailed Export**: Full activity history
   - All summary fields plus:
   - Activity dates and types
   - Reward name, coupon code, status
   - Issued date, expiry date, redeemed date

### Statistics Dashboard

- Total members
- Total visits
- Rewards issued
- Rewards redeemed

## API Reference

### Edge Function: confirm-loyalty-action

**Endpoint**: `POST /functions/v1/confirm-loyalty-action`

**Request Body**:
```json
{
  "memberCode": "ABC12345",
  "campaignId": "uuid",
  "actionType": "visit" | "redemption",
  "deviceInfo": { ... }
}
```

**Response (visit)**:
```json
{
  "success": true,
  "newProgress": 5,
  "rewardUnlocked": false,
  "threshold": 10
}
```

**Response (redemption)**:
```json
{
  "success": true,
  "shortCode": "XYZ123",
  "redemptionToken": "uuid",
  "newProgress": 0,
  "rewardName": "Free Coffee"
}
```

## Security Considerations

1. **Validation Required**: All stamp additions require staff validation
2. **Lockout Protection**: Configurable failed attempt threshold
3. **Manager Override**: Locked accounts require manager intervention
4. **Device Tokens**: 60-day expiry, stored securely
5. **RLS Policies**: Row-level security on all tables

## Migrations

| Migration | Purpose |
|-----------|---------|
| `20260125171048_add_loyalty_program_and_staff_system.sql` | Initial schema |
| `20260125181952_fix_loyalty_accounts_anon_update.sql` | Fix anon update policy |
| `20260127122313_add_loyalty_device_tokens.sql` | Add device token table |
| `20260127135122_add_loyalty_redemption_link.sql` | Link loyalty_redemptions to redemptions |

## Future Considerations

- Multi-tier reward programs
- Points-based systems (variable points per action)
- Birthday/anniversary bonuses
- Referral rewards
- Push notifications
- Offline mode support
- Analytics dashboard
