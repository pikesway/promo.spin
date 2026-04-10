# System Blueprint

---

## 1. Database Schema

### `agencies`
| Column | Type |
|--------|------|
| id | UUID |
| name | Text |
| email | Text |
| subdomain | Text |
| settings | JSONB |
| status | Text |
| created_at | Timestamptz |

### `clients`
| Column | Type |
|--------|------|
| id | UUID |
| agency_id | UUID |
| name | Text |
| email | Text |
| logo_url | Text |
| logo_type | Text |
| settings | JSONB |
| status | Text |
| primary_color | Text |
| secondary_color | Text |
| background_color | Text |
| status_notes | Text |
| status_updated_at | Timestamptz |
| unlock_pin | Text |
| active_brands_limit | Integer |
| active_users_limit | Integer |
| active_campaigns_limit | Integer |
| created_at | Timestamptz |

### `brands`
| Column | Type |
|--------|------|
| id | UUID |
| client_id | UUID |
| name | Text |
| logo_url | Text |
| logo_type | Text |
| primary_color | Text |
| secondary_color | Text |
| background_color | Text |
| unlock_pin | Text |
| loyalty_members_limit | Integer |
| active | Boolean |
| created_at | Timestamptz |
| updated_at | Timestamptz |

### `campaigns`
| Column | Type |
|--------|------|
| id | UUID |
| client_id | UUID |
| brand_id | UUID |
| name | Text |
| slug | Text |
| type | Text |
| status | Text |
| start_date | Timestamptz |
| end_date | Timestamptz |
| config | JSONB |
| analytics | JSONB |
| finalized_at | Timestamptz |
| finalized_by | UUID |
| created_at | Timestamptz |
| updated_at | Timestamptz |

### `profiles`
| Column | Type |
|--------|------|
| id | UUID |
| email | Text |
| full_name | Text |
| role | Enum (`super_admin`, `admin`, `client`, `staff`, `client_admin`, `client_user`) |
| client_id | UUID |
| is_active | Boolean |
| theme_preference | Text |
| created_at | Timestamptz |
| updated_at | Timestamptz |

### `leads`
| Column | Type |
|--------|------|
| id | UUID |
| campaign_id | UUID |
| client_id | UUID |
| brand_id | UUID |
| data | JSONB |
| metadata | JSONB |
| created_at | Timestamptz |

### `redemptions`
| Column | Type |
|--------|------|
| id | UUID |
| campaign_id | UUID |
| client_id | UUID |
| lead_id | UUID |
| prize_name | Text |
| short_code | Text |
| status | Text |
| generated_at | Timestamptz |
| expires_at | Timestamptz |
| redeemed_at | Timestamptz |
| redeemed_by | Text |
| metadata | JSONB |
| redemption_token | Text |
| token_expires_at | Timestamptz |
| email | Text |
| email_sent_at | Timestamptz |
| email_status | Text |

### `prize_inventory`
| Column | Type |
|--------|------|
| id | UUID |
| campaign_id | UUID |
| prize_name | Text |
| initial_quantity | Integer |
| remaining_quantity | Integer |
| created_at | Timestamptz |

### `game_plays`
| Column | Type |
|--------|------|
| id | UUID |
| campaign_id | UUID |
| campaign_game_instance_id | UUID |
| client_id | UUID |
| brand_id | UUID |
| lead_id | UUID |
| session_id | Text |
| game_system | Text |
| status | Text |
| score | Numeric |
| correct_answers | Integer |
| incorrect_answers | Integer |
| total_questions | Integer |
| completion_time_ms | Integer |
| scoring_mode | Text |
| is_win | Boolean |
| eligible_for_reward | Boolean |
| reward_label | Text |
| played_at | Timestamptz |
| completed_at | Timestamptz |
| ip_address | Inet |
| user_agent | Text |
| geo_lat | Double Precision |
| geo_lng | Double Precision |
| metadata | JSONB |

### `webhook_events`
| Column | Type |
|--------|------|
| id | UUID |
| campaign_id | UUID |
| client_id | UUID |
| game_code | Text |
| score | Integer |
| name | Text |
| email | Text |
| mobile | Text |
| raw_payload | JSONB |
| status | Text |
| error_message | Text |
| created_at | Timestamptz |
| processed_at | Timestamptz |

### `games`
| Column | Type |
|--------|------|
| id | UUID |
| name | Text |
| client_id | UUID |
| is_active | Boolean |
| data | JSONB |
| created_at | Timestamptz |
| updated_at | Timestamptz |

### `campaign_game_instances`
| Column | Type |
|--------|------|
| id | UUID |
| campaign_id | UUID |
| client_id | UUID |
| brand_id | UUID |
| name | Text |
| slug | Text |
| game_system | Text |
| template_id | Text |
| template_version | Text |
| sequence_number | Integer |
| status | Text |
| start_at | Timestamptz |
| end_at | Timestamptz |
| scoring_mode | Text |
| config | JSONB |
| launch_url | Text |
| external_instance_ref | Text |
| finalized_at | Timestamptz |
| finalized_by | UUID |
| created_at | Timestamptz |
| updated_at | Timestamptz |

### `campaign_leaderboards`
| Column | Type |
|--------|------|
| id | UUID |
| campaign_id | UUID |
| lead_id | UUID |
| final_score | Numeric |
| time_elapsed_seconds | Integer |
| completed_at | Timestamptz |
| metadata | JSONB |
| created_at | Timestamptz |

### `campaign_rewards`
| Column | Type |
|--------|------|
| id | UUID |
| campaign_id | UUID |
| reward_name | Text |
| threshold | Integer |
| reward_description | Text |
| reward_type | Text |
| reward_value | Text |
| active | Boolean |
| sort_order | Integer |
| created_at | Timestamptz |

### `campaign_bonus_rules`
| Column | Type |
|--------|------|
| id | UUID |
| campaign_id | UUID |
| name | Text |
| rule_type | Text |
| day_of_week | Integer |
| start_time | Time |
| end_time | Time |
| multiplier | Numeric |
| active | Boolean |
| created_at | Timestamptz |

### `campaign_insights_cache`
| Column | Type |
|--------|------|
| id | UUID |
| scope_type | Text |
| scope_id | UUID |
| data | JSONB |
| computed_at | Timestamptz |
| next_refresh_at | Timestamptz |

### `loyalty_programs`
| Column | Type |
|--------|------|
| id | UUID |
| campaign_id | UUID |
| program_type | Text |
| threshold | Integer |
| validation_method | Text |
| validation_config | JSONB |
| reward_name | Text |
| reward_description | Text |
| reset_behavior | Text |
| lockout_threshold | Integer |
| max_redemptions_per_period | Integer |
| period_type | Text |
| birthday_reward_enabled | Boolean |
| birthday_reward_name | Text |
| birthday_reward_description | Text |
| created_at | Timestamptz |
| updated_at | Timestamptz |

### `loyalty_accounts`
| Column | Type |
|--------|------|
| id | UUID |
| campaign_id | UUID |
| client_id | UUID |
| brand_id | UUID |
| email | Text |
| name | Text |
| phone | Text |
| current_progress | Integer |
| total_visits | Integer |
| reward_unlocked | Boolean |
| reward_unlocked_at | Timestamptz |
| member_code | Text |
| birthday | Date |
| enrolled_at | Timestamptz |
| updated_at | Timestamptz |

### `loyalty_progress_log`
| Column | Type |
|--------|------|
| id | UUID |
| loyalty_account_id | UUID |
| campaign_id | UUID |
| action_type | Text |
| quantity | Integer |
| stamp_value | Integer |
| bonus_rule_id | UUID |
| validated_by | UUID |
| device_info | JSONB |
| created_at | Timestamptz |

### `loyalty_redemptions`
| Column | Type |
|--------|------|
| id | UUID |
| loyalty_account_id | UUID |
| campaign_id | UUID |
| short_code | Text |
| status | Text |
| redeemed_at | Timestamptz |
| redeemed_by | UUID |
| expires_at | Timestamptz |
| redemption_id | UUID |
| redemption_source | Text |
| reward_tier_id | UUID |
| created_at | Timestamptz |

### `validation_attempts`
| Column | Type |
|--------|------|
| id | UUID |
| loyalty_account_id | UUID |
| campaign_id | UUID |
| attempt_type | Text |
| success | Boolean |
| device_info | JSONB |
| created_at | Timestamptz |

### `validation_lockouts`
| Column | Type |
|--------|------|
| id | UUID |
| loyalty_account_id | UUID |
| campaign_id | UUID |
| reason | Text |
| locked_at | Timestamptz |
| unlocked_at | Timestamptz |
| unlocked_by | UUID |

### `loyalty_device_tokens`
| Column | Type |
|--------|------|
| id | UUID |
| loyalty_account_id | UUID |
| campaign_id | UUID |
| device_token | Text |
| device_name | Text |
| expires_at | Timestamptz |
| created_at | Timestamptz |
| last_used_at | Timestamptz |

### `trivia_rewards`
| Column | Type |
|--------|------|
| id | UUID |
| campaign_id | UUID |
| instance_id | UUID |
| scope | Text |
| rank_min | Integer |
| rank_max | Integer |
| reward_name | Text |
| reward_description | Text |
| reward_value | Text |
| fulfillment_method | Text |
| quantity_limit | Integer |
| active | Boolean |
| created_at | Timestamptz |

### `trivia_reward_assignments`
| Column | Type |
|--------|------|
| id | UUID |
| trivia_reward_id | UUID |
| lead_id | UUID |
| game_play_id | UUID |
| instance_id | UUID |
| campaign_id | UUID |
| rank_achieved | Integer |
| score_achieved | Numeric |
| status | Text |
| issued_at | Timestamptz |
| fulfilled_at | Timestamptz |
| issued_by | UUID |
| redemption_id | UUID |
| created_at | Timestamptz |

### `user_brand_permissions`
| Column | Type |
|--------|------|
| id | UUID |
| user_id | UUID |
| brand_id | UUID |
| is_brand_manager | Boolean |
| can_add_campaign | Boolean |
| can_edit_campaign | Boolean |
| can_activate_pause_campaign | Boolean |
| can_delete_campaign | Boolean |
| active | Boolean |
| created_at | Timestamptz |
| updated_at | Timestamptz |

### `audit_logs`
| Column | Type |
|--------|------|
| id | UUID |
| actor_user_id | UUID |
| impersonated_client_id | UUID |
| impersonated_brand_id | UUID |
| action_type | Text |
| entity_type | Text |
| entity_id | UUID |
| metadata | JSONB |
| created_at | Timestamptz |

### `client_notifications`
| Column | Type |
|--------|------|
| id | UUID |
| client_id | UUID |
| title | Text |
| message | Text |
| created_at | Timestamptz |
| read_at | Timestamptz |

---

## 2. API Endpoints (Edge Functions)

All edge functions are hosted at: `{SUPABASE_URL}/functions/v1/{function-name}`

---

### `POST /functions/v1/play-game`

```json
{
  "campaignId": "string (uuid)",
  "sessionId": "string",
  "timestamp": "number",
  "leadData": {
    "email": "string",
    "name": "string",
    "phone": "string"
  }
}
```

---

### `POST /functions/v1/admin-users`

**Create user:**
```json
{
  "action": "create",
  "email": "string",
  "password": "string",
  "fullName": "string",
  "role": "string",
  "clientId": "string (uuid, optional)",
  "brandIds": ["string (uuid)"]
}
```

**Delete user:** `DELETE /functions/v1/admin-users/{userId}`

---

### `POST /functions/v1/mark-redeemed`

```json
{
  "shortCode": "string",
  "token": "string",
  "redeemedBy": "string (optional)"
}
```

---

### `POST /functions/v1/bizgamez-webhook`

Authentication: `Authorization: Bearer {TRIVIA_WEBHOOK_SECRET}`

**Lead capture event:**
```json
{
  "event_type": "lead_capture",
  "campaign_id": "string (uuid)",
  "instance_id": "string (uuid, optional)",
  "first_name": "string",
  "last_name": "string",
  "email": "string",
  "phone": "string"
}
```

**Game complete event:**
```json
{
  "event_type": "game_complete",
  "campaign_id": "string (uuid)",
  "lead_id": "string (uuid)",
  "final_score": "number",
  "time_elapsed_seconds": "number",
  "instance_id": "string (uuid, optional)",
  "device_id": "string (optional)"
}
```

---

### `POST /functions/v1/confirm-loyalty-action`

```json
{
  "memberCode": "string",
  "campaignId": "string (uuid)",
  "actionType": "visit | redemption",
  "validationInput": "string (optional)",
  "deviceInfo": "object (optional)",
  "rewardTierId": "string (uuid, optional)",
  "bypassCoolDown": "boolean (optional)"
}
```

---

### `POST /functions/v1/redeem-birthday-reward`

```json
{
  "memberCode": "string",
  "campaignId": "string (uuid)",
  "deviceInfo": "object (optional)"
}
```

---

### `POST /functions/v1/send-redemption-email`

```json
{
  "redemptionId": "string (uuid)"
}
```

---

### `GET /functions/v1/trivia-templates-proxy`

Query parameters:
- `search` (optional string)

No request body.

---

### `POST /functions/v1/compute-campaign-insights`

```json
{
  "scopeType": "campaign | brand | client",
  "scopeId": "string (uuid)",
  "forceRefresh": "boolean (optional)"
}
```

---

## 3. Core Integrations

| Service | Purpose | Auth Method |
|---------|---------|-------------|
| **Supabase** | Primary database, authentication, and edge function hosting | `VITE_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` |
| **Resend** | Transactional email (redemption confirmations) | `RESEND_API_KEY` (Bearer token) — called from `send-redemption-email` |
| **BizGamez / QuizBattles Trivia Runtime** | External trivia game player hosted at `https://quizbattles-trivia-r-zu2v.bolt.host` | `TRIVIA_WEBHOOK_SECRET` (inbound webhook Bearer token) |
| **Trivia Supabase Instance** | Remote Supabase project serving public trivia templates | `TRIVIA_SUPABASE_ANON_KEY` — proxied via `trivia-templates-proxy` |
