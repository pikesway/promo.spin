# Trivia Webhook Integration Documentation

## Overview

The Trivia Webhook Integration provides a secure API endpoint for external trivia applications to send lead capture and game completion data to the BizGamez platform. This decoupled architecture allows trivia games to operate independently while seamlessly integrating player data and scores.

## Architecture

```
+-------------------+          HTTPS POST           +----------------------+
|                   |  ----------------------->     |                      |
| External Trivia   |  Bearer Token Auth            | BizGamez Webhook     |
| Application       |  JSON Payload                 | Edge Function        |
|                   |  <-----------------------     |                      |
+-------------------+     200/400/401 Response      +----------+-----------+
                                                               |
                                                               v
                                                    +----------+-----------+
                                                    |                      |
                                                    | Supabase Database    |
                                                    | - leads              |
                                                    | - campaign_leaderboards |
                                                    +----------------------+
```

## Security

### Authentication

All webhook requests MUST include an `Authorization` header with a Bearer token:

```
Authorization: Bearer <TRIVIA_WEBHOOK_SECRET>
```

The webhook validates this token against the `TRIVIA_WEBHOOK_SECRET` environment variable configured in Supabase. Requests with missing, malformed, or invalid tokens are rejected with a 401 Unauthorized response.

### Environment Variable Setup

The `TRIVIA_WEBHOOK_SECRET` is automatically configured in the Supabase environment. This secret must be securely shared with the external trivia application for authentication.

## Webhook Endpoint

**URL:** `https://yfhuxvjqpnkwacueapzv.supabase.co/functions/v1/bizgamez-webhook`

**Method:** POST

**Content-Type:** application/json

## Event Types

### 1. Lead Capture Event

Captures player information when they sign up to play a trivia game.

**Event Type:** `lead_capture`

**Payload:**

```json
{
  "event_type": "lead_capture",
  "campaign_id": "uuid-of-campaign",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890"
}
```

**Required Fields:**
- `event_type`: Must be "lead_capture"
- `campaign_id`: UUID of the active campaign
- `first_name`: Player's first name
- `last_name`: Player's last name
- `email`: Player's email address
- `phone`: Player's phone number

**Behavior:**
- Validates that the campaign exists and is active
- Performs upsert logic: If a lead with the same email exists in the same brand, updates their information
- Creates a new lead if no match is found
- Normalizes email to lowercase and trims whitespace
- Sets `source_type` to "trivia_webhook" for tracking

**Success Response (200):**

```json
{
  "success": true,
  "lead_id": "uuid-of-lead",
  "message": "Lead captured successfully"
}
```

**Error Responses:**

- **400 Bad Request:** Missing required fields, campaign not active
- **401 Unauthorized:** Missing or invalid authentication token
- **404 Not Found:** Campaign not found
- **500 Internal Server Error:** Database error

### 2. Game Complete Event

Records a completed game play with score and timing information.

**Event Type:** `game_complete`

**Payload:**

```json
{
  "event_type": "game_complete",
  "campaign_id": "uuid-of-campaign",
  "lead_id": "uuid-of-lead",
  "final_score": 850,
  "time_elapsed_seconds": 120
}
```

**Required Fields:**
- `event_type`: Must be "game_complete"
- `campaign_id`: UUID of the active campaign
- `lead_id`: UUID of the lead (returned from lead_capture)
- `final_score`: Numeric score achieved (can be decimal)
- `time_elapsed_seconds`: Time taken to complete in seconds (integer)

**Behavior:**
- Validates that the campaign exists and is active
- Validates that the lead exists
- Verifies that the lead belongs to the same client/brand as the campaign
- Inserts a new record into the `campaign_leaderboards` table
- Allows multiple entries per lead per campaign (for analytics)

**Success Response (200):**

```json
{
  "success": true,
  "leaderboard_entry_id": "uuid-of-entry",
  "message": "Game completion recorded successfully"
}
```

**Error Responses:**

- **400 Bad Request:** Missing required fields, campaign not active, lead/campaign mismatch
- **401 Unauthorized:** Missing or invalid authentication token
- **404 Not Found:** Campaign or lead not found
- **500 Internal Server Error:** Database error

## Example Workflow

### Step 1: Player Signs Up

```bash
curl -X POST https://yfhuxvjqpnkwacueapzv.supabase.co/functions/v1/bizgamez-webhook \
  -H "Authorization: Bearer your-secret-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "lead_capture",
    "campaign_id": "123e4567-e89b-12d3-a456-426614174000",
    "first_name": "Jane",
    "last_name": "Smith",
    "email": "jane.smith@example.com",
    "phone": "+1234567890"
  }'
```

**Response:**

```json
{
  "success": true,
  "lead_id": "987e6543-e21b-12d3-a456-426614174999",
  "message": "Lead captured successfully"
}
```

### Step 2: Player Completes Game

```bash
curl -X POST https://yfhuxvjqpnkwacueapzv.supabase.co/functions/v1/bizgamez-webhook \
  -H "Authorization: Bearer your-secret-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "game_complete",
    "campaign_id": "123e4567-e89b-12d3-a456-426614174000",
    "lead_id": "987e6543-e21b-12d3-a456-426614174999",
    "final_score": 1250,
    "time_elapsed_seconds": 95
  }'
```

**Response:**

```json
{
  "success": true,
  "leaderboard_entry_id": "456e7890-e12b-34d5-a678-901234567890",
  "message": "Game completion recorded successfully"
}
```

## Database Schema

### campaign_leaderboards Table

Stores all game completion records for leaderboard and analytics.

```sql
CREATE TABLE campaign_leaderboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id),
  lead_id uuid NOT NULL REFERENCES leads(id),
  final_score numeric NOT NULL DEFAULT 0,
  time_elapsed_seconds integer NOT NULL DEFAULT 0,
  completed_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
```

**Key Features:**
- Multiple entries per lead per campaign allowed
- Indexed for efficient leaderboard queries
- Metadata field for extensibility
- Foreign key constraints ensure data integrity

## Error Handling

The webhook provides clear, actionable error messages for debugging:

### Common Error Scenarios

1. **Missing Authorization Header**
   ```json
   {
     "error": "Missing Authorization header"
   }
   ```

2. **Invalid Token Format**
   ```json
   {
     "error": "Invalid Authorization header format. Expected: Bearer <token>"
   }
   ```

3. **Authentication Failed**
   ```json
   {
     "error": "Invalid webhook authentication token"
   }
   ```

4. **Campaign Not Active**
   ```json
   {
     "error": "Campaign is not active. Current status: draft"
   }
   ```

5. **Lead/Campaign Mismatch**
   ```json
   {
     "error": "Lead does not belong to the same client as the campaign"
   }
   ```

6. **Unsupported Event Type**
   ```json
   {
     "error": "Unsupported event_type: invalid_type. Supported types: lead_capture, game_complete"
   }
   ```

## HTTP Status Codes

- **200 OK:** Request successful
- **400 Bad Request:** Invalid payload, missing fields, or business logic validation failed
- **401 Unauthorized:** Authentication failed
- **404 Not Found:** Campaign or lead not found
- **500 Internal Server Error:** Database or server error

## Leaderboard Display

When displaying leaderboards in the BizGamez platform, query for the highest score per lead:

```sql
SELECT
  lead_id,
  MAX(final_score) as best_score,
  MIN(time_elapsed_seconds) as best_time
FROM campaign_leaderboards
WHERE campaign_id = 'campaign-uuid'
GROUP BY lead_id
ORDER BY best_score DESC, best_time ASC
LIMIT 100;
```

## Testing

### Test Lead Capture

```bash
curl -X POST https://yfhuxvjqpnkwacueapzv.supabase.co/functions/v1/bizgamez-webhook \
  -H "Authorization: Bearer test-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "lead_capture",
    "campaign_id": "valid-campaign-id",
    "first_name": "Test",
    "last_name": "User",
    "email": "test@example.com",
    "phone": "+1234567890"
  }'
```

### Test Game Complete

```bash
curl -X POST https://yfhuxvjqpnkwacueapzv.supabase.co/functions/v1/bizgamez-webhook \
  -H "Authorization: Bearer test-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "game_complete",
    "campaign_id": "valid-campaign-id",
    "lead_id": "valid-lead-id",
    "final_score": 1000,
    "time_elapsed_seconds": 60
  }'
```

## Best Practices

1. **Idempotency:** The lead_capture event is idempotent by email within a brand. Multiple submissions with the same email will update the existing lead.

2. **Error Handling:** External applications should implement retry logic for 500 errors but not for 400/401/404 errors.

3. **Rate Limiting:** Consider implementing rate limiting on the external trivia application side to prevent abuse.

4. **Logging:** All webhook attempts are logged. Monitor logs for failed authentication attempts.

5. **Security:** The TRIVIA_WEBHOOK_SECRET should be stored securely and rotated periodically.

## Support

For issues or questions about the webhook integration, contact the BizGamez development team.
