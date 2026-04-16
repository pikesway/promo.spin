# Trivia Overrides — System Architecture Guide

---

## Overview

The trivia overrides system provides **instance-level configuration** that supersedes campaign-level defaults. A single trivia campaign can contain multiple game instances (e.g., weekly rounds), each with its own scoring mode, visual theme, timer settings, and reward tiers. Overrides are stored in the `campaign_game_instances` table and are pushed to the external Trivia Runtime before a session goes live.

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│  Admin UI (React)                                           │
│  TriviaCampaignBuilder → GameInstanceForm                   │
│  TriviaRewardConfig → TriviaRewardAssignments               │
└──────────────────────────┬──────────────────────────────────┘
                           │ create / update / finalize
┌──────────────────────────▼──────────────────────────────────┐
│  Supabase Database                                          │
│  campaigns → campaign_game_instances → game_plays           │
│  trivia_rewards → trivia_reward_assignments                 │
│  campaign_leaderboards                                      │
└───────────────┬─────────────────────────┬───────────────────┘
                │ sync overrides          │ webhook ingest
┌───────────────▼───────────┐  ┌──────────▼───────────────────┐
│  Trivia Runtime (external)│  │  bizgamez-webhook (Edge Fn)  │
│  Applies scoring_mode     │  │  Receives game_complete event │
│  Renders config overrides │  │  Stores raw scores           │
└───────────────────────────┘  └──────────────────────────────┘
```

---

## 1. The Two Override Axes

### 1a. Scoring Mode Override

Scoring mode controls how the external Trivia Runtime calculates a player's final score before sending it to the webhook.

| Level | Field | Location |
|-------|-------|----------|
| Campaign default | `campaigns.config.trivia.scoringMode` | `campaigns` table |
| Instance override | `campaign_game_instances.scoring_mode` | `campaign_game_instances` table |

**Possible values:**

| Value | Behavior |
|-------|----------|
| `accuracy_only` | Final score = correct answers only. Time is ignored. |
| `accuracy_speed_weighted` | Final score = accuracy weighted heavily + speed bonus |
| `accuracy_then_fastest_time` | Players ranked by accuracy first; time used as tiebreaker only |

**Resolution rule:** If `campaign_game_instances.scoring_mode` is non-null, that value is sent to the Trivia Runtime during sync. If null, the campaign default applies.

---

### 1b. Config JSONB Override

The `config` JSONB column on `campaign_game_instances` stores arbitrary per-instance overrides that are merged on top of the template's base configuration when the Trivia Runtime renders the game.

**Full config shape:**

```json
{
  "question_count": 15,
  "question_mode": "fixed",
  "timer": {
    "seconds": 30,
    "mode": "per_question"
  },
  "theme": {
    "primary_text_color": "#FFFFFF",
    "button_fill_color": "#3b82f6"
  },
  "ui": {
    "background_url": "https://..."
  },
  "screens": {
    "start": {
      "headline": "Ready to Play?",
      "button_label": "Start Quiz"
    }
  },
  "lead_capture": {
    "enabled": true
  }
}
```

Any field present in the instance `config` overrides the same field in the template. Fields absent from instance `config` fall through to the template default.

---

## 2. Database Schema

### `campaign_game_instances` — the override record

```sql
id                    UUID        PRIMARY KEY
campaign_id           UUID        FK → campaigns.id
client_id             UUID        FK → clients.id
brand_id              UUID        FK → brands.id
name                  TEXT        Human-readable label (e.g., "Week 1")
slug                  TEXT        URL-safe identifier
game_system           TEXT        Always 'trivia' currently
template_id           TEXT        External template reference
template_version      TEXT
sequence_number       INTEGER     Ordering within campaign
status                TEXT        draft|scheduled|active|paused|completed|archived
start_at              TIMESTAMPTZ
end_at                TIMESTAMPTZ
scoring_mode          TEXT        NULL = use campaign default; non-null = override
config                JSONB       Per-instance config overrides (see §1b)
launch_url            TEXT        Full URL with embedded instance_id
external_instance_ref TEXT        ID on the remote Trivia Runtime
finalized_at          TIMESTAMPTZ Set when finalize_game_instance() runs
finalized_by          UUID        FK → profiles.id
created_at            TIMESTAMPTZ
updated_at            TIMESTAMPTZ
```

### `trivia_rewards` — scoped reward tiers

```sql
id                    UUID        PRIMARY KEY
campaign_id           UUID        FK → campaigns.id
instance_id           UUID        FK → campaign_game_instances.id (NULL if scope='campaign')
scope                 TEXT        'campaign' | 'instance'
rank_min              INTEGER     Inclusive lower bound of qualifying ranks
rank_max              INTEGER     Inclusive upper bound of qualifying ranks
reward_name           TEXT
reward_description    TEXT
reward_value          TEXT
fulfillment_method    TEXT        'manual' | 'platform'
quantity_limit        INTEGER     NULL = unlimited
active                BOOLEAN

-- DB constraint enforces scope/instance_id relationship:
-- (scope='campaign' AND instance_id IS NULL) OR
-- (scope='instance' AND instance_id IS NOT NULL)
```

### `trivia_reward_assignments` — per-player reward records

```sql
id                    UUID        PRIMARY KEY
trivia_reward_id      UUID        FK → trivia_rewards.id
lead_id               UUID        FK → leads.id
game_play_id          UUID        FK → game_plays.id
instance_id           UUID        NULL for campaign-scope assignments
campaign_id           UUID        FK → campaigns.id
rank_achieved         INTEGER
score_achieved        NUMERIC
status                TEXT        'pending' | 'issued' | 'fulfilled'
issued_at             TIMESTAMPTZ
fulfilled_at          TIMESTAMPTZ
issued_by             UUID        FK → profiles.id
redemption_id         UUID        FK → redemptions.id (if platform fulfillment)
```

### `campaign_leaderboards` — raw score ingestion

```sql
id                    UUID        PRIMARY KEY
campaign_id           UUID        FK → campaigns.id
lead_id               UUID        FK → leads.id
final_score           NUMERIC
time_elapsed_seconds  INTEGER
completed_at          TIMESTAMPTZ
metadata              JSONB       { instance_id, device_id, source, received_at }
```

> **Note:** `instance_id` lives inside `metadata` — it is informational only at ingestion time. Ranking and reward assignment happen later during finalization.

---

## 3. Creating and Syncing an Override

### Admin UI: `GameInstanceForm.jsx`

When an admin creates or updates an instance, the form collects:
- `name`, `slug`, `sequence_number`
- `scoring_mode` (nullable select)
- `start_at`, `end_at`
- All `config` sub-fields (question count, timer, theme, screens, lead capture)

On save, two things happen sequentially:

**Step 1 — Write to Supabase:**

```javascript
// src/components/admin/trivia/GameInstanceForm.jsx

const payload = {
  campaign_id: campaignId,
  client_id: clientId,
  brand_id: brandId,
  name: formData.name,
  slug: formData.slug,
  sequence_number: formData.sequenceNumber,
  game_system: 'trivia',
  template_id: formData.templateId,
  scoring_mode: formData.scoringMode || null,   // NULL = use campaign default
  start_at: formData.startAt || null,
  end_at: formData.endAt || null,
  status: 'draft',
  config: {
    question_count: formData.questionCount,
    question_mode: formData.questionMode,
    timer: { seconds: formData.timerSeconds, mode: formData.timerMode },
    theme: {
      primary_text_color: formData.primaryTextColor,
      button_fill_color: formData.buttonFillColor
    },
    ui: { background_url: formData.backgroundUrl },
    screens: { start: { headline: formData.headline, button_label: formData.buttonLabel } },
    lead_capture: { enabled: formData.leadCaptureEnabled }
  }
};

const { data, error } = await supabase
  .from('campaign_game_instances')
  .insert(payload)
  .select()
  .single();
```

**Step 2 — Push overrides to Trivia Runtime:**

```javascript
// src/components/admin/trivia/GameInstanceForm.jsx

const syncToRuntime = async (instanceId, status, startTime, endTime) => {
  const syncEndpoint = `${VITE_TRIVIA_RUNTIME_URL}/functions/v1/sync-instance-override`;

  const syncPayload = {
    instance_id: instanceId,
    campaign_id: campaignId,
    status: status || null,
    start_time: startTime || null,
    end_time: endTime || null,
    settings: formData.config || {}   // Full config object pushed to runtime
  };

  await fetch(syncEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': VITE_TRIVIA_RUNTIME_ANON_KEY,
      'Authorization': `Bearer ${VITE_TRIVIA_RUNTIME_ANON_KEY}`
    },
    body: JSON.stringify(syncPayload)
  });
};
```

The Trivia Runtime stores these overrides and applies them when a player loads the game via the launch URL.

---

## 4. Launch URL Generation

The launch URL embeds the `instance_id` so the Trivia Runtime knows which override set to load.

```javascript
// src/utils/triviaUrlGenerator.js

export const generateTriviaLaunchUrl = (campaignSlug, instanceId, options = {}) => {
  const base = import.meta.env.VITE_TRIVIA_RUNTIME_URL;
  const params = new URLSearchParams({
    campaign: campaignSlug,
    instance: instanceId,
    ...(options.preview && { preview: '1' }),
  });
  return `${base}/play?${params.toString()}`;
};
```

When a player opens this URL, the Trivia Runtime:
1. Looks up the instance by `instance_id`
2. Fetches the merged config (template base + instance overrides)
3. Applies the instance's `scoring_mode` to score computation
4. Renders the game with the overridden theme and settings

---

## 5. Webhook Ingestion

### `bizgamez-webhook` Edge Function

**Route:** `POST /functions/v1/bizgamez-webhook`
**Auth:** `Authorization: Bearer {TRIVIA_WEBHOOK_SECRET}`

The webhook receives two event types. Only `game_complete` interacts with the override system.

#### `lead_capture` payload

```json
{
  "event_type": "lead_capture",
  "campaign_id": "uuid",
  "instance_id": "uuid (optional)",
  "first_name": "string",
  "last_name": "string",
  "email": "string",
  "phone": "string"
}
```

#### `game_complete` payload

```json
{
  "event_type": "game_complete",
  "campaign_id": "uuid",
  "lead_id": "uuid",
  "final_score": 850,
  "time_elapsed_seconds": 47,
  "instance_id": "uuid (optional)",
  "device_id": "string (optional)"
}
```

> `final_score` has already been computed by the Trivia Runtime using the instance's `scoring_mode`. The webhook stores it as-is.

#### Webhook processing logic

```typescript
// supabase/functions/bizgamez-webhook/index.ts

// --- Validation phase ---
const { campaign_id, lead_id, final_score, time_elapsed_seconds, instance_id } = body;

// 1. Verify campaign exists and is active
const { data: campaign } = await supabase
  .from('campaigns')
  .select('id, client_id, brand_id, status, type')
  .eq('id', campaign_id)
  .eq('type', 'trivia')
  .single();

if (!campaign || campaign.status !== 'active') {
  return errorResponse('Campaign not found or not active', 404);
}

// 2. If instance_id provided, verify it exists and has not ended
if (instance_id) {
  const { data: instance } = await supabase
    .from('campaign_game_instances')
    .select('id, status, end_at, campaign_id')
    .eq('id', instance_id)
    .eq('campaign_id', campaign_id)
    .single();

  if (!instance) {
    return errorResponse('Instance not found', 404);
  }

  if (instance.end_at && new Date(instance.end_at) < new Date()) {
    return errorResponse('Game instance has ended', 400);
  }
}

// 3. Verify lead exists and belongs to the same client
const { data: lead } = await supabase
  .from('leads')
  .select('id, client_id, brand_id')
  .eq('id', lead_id)
  .single();

if (!lead || lead.client_id !== campaign.client_id) {
  return errorResponse('Lead not found or client mismatch', 404);
}

// --- Storage phase ---
// Scores are stored raw; instance_id is preserved in metadata
const { data: leaderboardEntry } = await supabase
  .from('campaign_leaderboards')
  .insert({
    campaign_id,
    lead_id,
    final_score,
    time_elapsed_seconds,
    completed_at: new Date().toISOString(),
    metadata: {
      source: 'trivia_webhook',
      instance_id: instance_id ?? null,
      device_id: device_id ?? null,
      received_at: new Date().toISOString()
    }
  })
  .select()
  .single();

return successResponse({ leaderboard_entry_id: leaderboardEntry.id });
```

**Key point:** The webhook does not compute rankings or assign rewards. It only stores raw data. Rankings and rewards are computed during finalization.

---

## 6. Reward Configuration

### `TriviaRewardConfig.jsx`

Rewards are created with an explicit `scope` of `'campaign'` or `'instance'`. Instance-scoped rewards require an `instance_id`.

```javascript
// src/components/admin/trivia/TriviaRewardConfig.jsx

const handleFormSave = async (data) => {
  const reward = {
    campaign_id: campaignId,
    scope: formScope,                                          // 'campaign' | 'instance'
    instance_id: formScope === 'instance' ? formInstanceId : null,
    rank_min: data.rankMin,
    rank_max: data.rankMax,
    reward_name: data.rewardName,
    reward_description: data.rewardDescription,
    reward_value: data.rewardValue,
    fulfillment_method: data.fulfillmentMethod,                // 'manual' | 'platform'
    quantity_limit: data.quantityLimit || null,
    active: true
  };

  if (editingReward) {
    await supabase.from('trivia_rewards').update(reward).eq('id', editingReward.id);
  } else {
    await supabase.from('trivia_rewards').insert(reward);
  }
};
```

---

## 7. Finalization

Finalization is the process that computes rankings from raw scores and assigns rewards. It is triggered manually by an admin. It is **idempotent** — running it twice on the same instance/campaign produces the same result.

### Instance Finalization — `finalize_game_instance(p_instance_id)`

```sql
-- supabase/migrations/20260326155157_add_finalize_instance_function.sql

CREATE OR REPLACE FUNCTION finalize_game_instance(p_instance_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_instance        campaign_game_instances%ROWTYPE;
  v_user_id         UUID := auth.uid();
  v_reward          trivia_rewards%ROWTYPE;
  v_players_ranked  INT := 0;
  v_anon_excluded   INT := 0;
  v_rewards_assigned INT := 0;
BEGIN
  -- 1. Lock and fetch instance
  SELECT * INTO v_instance
  FROM campaign_game_instances
  WHERE id = p_instance_id
  FOR UPDATE;

  -- 2. Idempotency check
  IF v_instance.finalized_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_finalized', true,
      'finalized_at', v_instance.finalized_at
    );
  END IF;

  -- 3. Transition status to completed
  IF v_instance.status IN ('active', 'paused', 'scheduled', 'draft') THEN
    UPDATE campaign_game_instances
    SET status = 'completed', updated_at = NOW()
    WHERE id = p_instance_id;
  END IF;

  -- 4. Build ranked leaderboard from game_plays
  --    Best play per lead (highest score, then fastest time)
  --    Anonymous plays (lead_id IS NULL) are excluded
  WITH ranked_plays AS (
    SELECT
      lead_id,
      score,
      completion_time_ms,
      id AS game_play_id,
      ROW_NUMBER() OVER (
        PARTITION BY lead_id
        ORDER BY score DESC, completion_time_ms ASC
      ) AS play_rank
    FROM game_plays
    WHERE campaign_game_instance_id = p_instance_id
      AND status = 'completed'
      AND lead_id IS NOT NULL
  ),
  best_plays AS (
    SELECT lead_id, score, completion_time_ms, game_play_id
    FROM ranked_plays
    WHERE play_rank = 1
  ),
  final_ranks AS (
    SELECT
      lead_id,
      score,
      completion_time_ms,
      game_play_id,
      DENSE_RANK() OVER (
        ORDER BY score DESC, completion_time_ms ASC
      )::INT AS rank
    FROM best_plays
  )
  -- 5. For each active instance-scope reward tier, assign to qualifying players
  FOR v_reward IN
    SELECT * FROM trivia_rewards
    WHERE instance_id = p_instance_id
      AND scope = 'instance'
      AND active = true
  LOOP
    INSERT INTO trivia_reward_assignments (
      trivia_reward_id, lead_id, game_play_id,
      instance_id, campaign_id,
      rank_achieved, score_achieved, status
    )
    SELECT
      v_reward.id, fr.lead_id, fr.game_play_id,
      p_instance_id, v_instance.campaign_id,
      fr.rank, fr.score, 'pending'
    FROM final_ranks fr
    WHERE fr.rank >= v_reward.rank_min
      AND fr.rank <= v_reward.rank_max
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS v_rewards_assigned = v_rewards_assigned + ROW_COUNT;
  END LOOP;

  -- 6. Mark instance as finalized
  UPDATE campaign_game_instances
  SET finalized_at = NOW(), finalized_by = v_user_id
  WHERE id = p_instance_id;

  RETURN jsonb_build_object(
    'success', true,
    'already_finalized', false,
    'players_ranked', v_players_ranked,
    'anonymous_excluded', v_anon_excluded,
    'rewards_assigned', v_rewards_assigned
  );
END;
$$;
```

### Campaign Finalization — `finalize_trivia_campaign(p_campaign_id)`

Campaign finalization uses **cumulative scoring** across all finalized instances.

```sql
-- supabase/migrations/20260326155242_add_finalize_campaign_function.sql

CREATE OR REPLACE FUNCTION finalize_trivia_campaign(p_campaign_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_campaign         campaigns%ROWTYPE;
  v_user_id          UUID := auth.uid();
  v_reward           trivia_rewards%ROWTYPE;
  v_players_ranked   INT := 0;
  v_rewards_assigned INT := 0;
BEGIN
  -- 1. Lock and fetch campaign
  SELECT * INTO v_campaign
  FROM campaigns WHERE id = p_campaign_id FOR UPDATE;

  -- 2. Verify campaign is trivia type
  IF v_campaign.type != 'trivia' THEN
    RAISE EXCEPTION 'Campaign is not of type trivia';
  END IF;

  -- 3. Idempotency check
  IF v_campaign.finalized_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'already_finalized', true);
  END IF;

  -- 4. Compute cumulative scores — only from FINALIZED instances
  WITH instance_best_plays AS (
    -- Best play per lead per instance
    SELECT
      gp.lead_id,
      gp.campaign_game_instance_id AS instance_id,
      MAX(gp.score) AS best_score,
      MIN(gp.completion_time_ms) AS best_time_ms
    FROM game_plays gp
    INNER JOIN campaign_game_instances cgi
      ON cgi.id = gp.campaign_game_instance_id
    WHERE gp.campaign_id = p_campaign_id
      AND gp.status = 'completed'
      AND gp.lead_id IS NOT NULL
      AND cgi.finalized_at IS NOT NULL    -- Only finalized instances count
    GROUP BY gp.lead_id, gp.campaign_game_instance_id
  ),
  aggregated AS (
    -- Sum scores across all instances per lead
    SELECT
      lead_id,
      SUM(best_score)  AS total_score,   -- CUMULATIVE scoring
      MIN(best_time_ms) AS best_time_ms,
      COUNT(DISTINCT instance_id) AS instances_played
    FROM instance_best_plays
    GROUP BY lead_id
  ),
  final_ranks AS (
    SELECT
      lead_id, total_score, best_time_ms, instances_played,
      DENSE_RANK() OVER (
        ORDER BY total_score DESC, best_time_ms ASC
      )::INT AS rank
    FROM aggregated
  )
  -- 5. Assign campaign-scope rewards
  FOR v_reward IN
    SELECT * FROM trivia_rewards
    WHERE campaign_id = p_campaign_id
      AND scope = 'campaign'
      AND instance_id IS NULL
      AND active = true
  LOOP
    INSERT INTO trivia_reward_assignments (
      trivia_reward_id, lead_id, game_play_id,
      instance_id,      -- NULL for campaign-scope
      campaign_id, rank_achieved, score_achieved, status
    )
    SELECT
      v_reward.id, fr.lead_id, NULL,
      NULL,
      p_campaign_id, fr.rank, fr.total_score, 'pending'
    FROM final_ranks fr
    WHERE fr.rank >= v_reward.rank_min
      AND fr.rank <= v_reward.rank_max
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS v_rewards_assigned = v_rewards_assigned + ROW_COUNT;
  END LOOP;

  -- 6. Mark campaign as finalized
  UPDATE campaigns
  SET finalized_at = NOW(), finalized_by = v_user_id
  WHERE id = p_campaign_id;

  RETURN jsonb_build_object(
    'success', true,
    'already_finalized', false,
    'players_ranked', v_players_ranked,
    'rewards_assigned', v_rewards_assigned
  );
END;
$$;
```

### Admin Finalization UI — `TriviaCampaignBuilder.jsx`

```javascript
// src/components/admin/TriviaCampaignBuilder.jsx

const handleFinalizeInstance = async (instanceId) => {
  setFinalizing(instanceId);
  const { data, error } = await supabase.rpc('finalize_game_instance', {
    p_instance_id: instanceId
  });

  if (error) {
    showError(`Finalization failed: ${error.message}`);
  } else if (data.already_finalized) {
    showInfo('Instance was already finalized.');
  } else {
    showSuccess(
      `Instance finalized. ${data.players_ranked} players ranked, ` +
      `${data.rewards_assigned} rewards assigned.`
    );
  }
  setFinalizing(null);
  refreshInstances();
};

const handleFinalizeCampaign = async () => {
  setFinalizingCampaign(true);
  const { data, error } = await supabase.rpc('finalize_trivia_campaign', {
    p_campaign_id: campaignId
  });

  if (error) {
    showError(`Campaign finalization failed: ${error.message}`);
  } else {
    showSuccess(
      `Campaign finalized. ${data.rewards_assigned} campaign-level rewards assigned.`
    );
  }
  setFinalizingCampaign(false);
};
```

---

## 8. Reward Issuance

After finalization, `trivia_reward_assignments` rows are in `status = 'pending'`. Admins issue them via `TriviaRewardAssignments.jsx`.

```javascript
// src/components/admin/trivia/TriviaRewardAssignments.jsx

// Manual fulfillment — admin marks as issued
const handleMarkIssued = async (assignmentId) => {
  await supabase
    .from('trivia_reward_assignments')
    .update({
      status: 'issued',
      issued_at: new Date().toISOString(),
      issued_by: currentUser.id
    })
    .eq('id', assignmentId);
};

// Platform fulfillment — generates a redemption code
const handleIssuePlatform = async (assignment) => {
  // 1. Create a redemption record
  const { data: redemption } = await supabase
    .from('redemptions')
    .insert({
      campaign_id: assignment.campaign_id,
      client_id: clientId,
      lead_id: assignment.lead_id,
      prize_name: assignment.trivia_rewards.reward_name,
      short_code: generateShortCode(),
      status: 'valid',
      expires_at: getExpiryDate()
    })
    .select()
    .single();

  // 2. Link redemption to assignment
  await supabase
    .from('trivia_reward_assignments')
    .update({
      status: 'issued',
      issued_at: new Date().toISOString(),
      issued_by: currentUser.id,
      redemption_id: redemption.id
    })
    .eq('id', assignment.id);
};
```

---

## 9. Complete Data Flow

```
1. ADMIN SETUP
   ├── Create trivia campaign (sets default_scoring_mode, leaderboard_scope)
   ├── Create game instances (each with optional scoring_mode + config overrides)
   │   └── syncToRuntime() pushes overrides to external Trivia Runtime
   └── Create trivia rewards (scope='instance' per instance, scope='campaign' for aggregate)

2. PLAYER GAMEPLAY
   ├── Player opens launch URL → Trivia Runtime applies scoring_mode override
   ├── Player completes game → Runtime computes final_score using scoring_mode
   └── Runtime POST → /functions/v1/bizgamez-webhook
       ├── lead_capture: upsert lead record
       └── game_complete: INSERT campaign_leaderboards { final_score, instance_id in metadata }

3. ADMIN FINALIZATION (per instance)
   └── supabase.rpc('finalize_game_instance', { p_instance_id })
       ├── Status → 'completed'
       ├── DENSE_RANK players by (score DESC, time ASC)
       ├── INSERT trivia_reward_assignments WHERE rank BETWEEN rank_min AND rank_max
       │   (scope='instance' rewards only)
       └── SET finalized_at = NOW()

4. ADMIN FINALIZATION (campaign)
   └── supabase.rpc('finalize_trivia_campaign', { p_campaign_id })
       ├── SELECT SUM(best_score per instance) per lead — only finalized instances
       ├── DENSE_RANK by cumulative total_score DESC, best_time ASC
       ├── INSERT trivia_reward_assignments WHERE rank in range
       │   (scope='campaign' rewards, instance_id = NULL)
       └── SET campaigns.finalized_at = NOW()

5. REWARD ISSUANCE
   ├── Admin reviews trivia_reward_assignments (status='pending')
   ├── Manual: UPDATE status='issued', issued_by, issued_at
   └── Platform: INSERT redemptions → UPDATE status='issued', redemption_id
```

---

## 10. Override Precedence Reference

| Setting | Campaign Level | Instance Level (Override) |
|---------|---------------|--------------------------|
| Scoring mode | `campaigns.config.trivia.scoringMode` | `campaign_game_instances.scoring_mode` (NULL = inherit) |
| Question count | Template default | `campaign_game_instances.config.question_count` |
| Timer | Template default | `campaign_game_instances.config.timer` |
| Theme colors | Template default | `campaign_game_instances.config.theme` |
| Background image | Template default | `campaign_game_instances.config.ui.background_url` |
| Screen copy | Template default | `campaign_game_instances.config.screens` |
| Lead capture | Template default | `campaign_game_instances.config.lead_capture.enabled` |
| Reward tiers | `trivia_rewards` WHERE `scope='campaign'` | `trivia_rewards` WHERE `scope='instance'` AND `instance_id=X` |
| Leaderboard scope | `campaigns.config.trivia.leaderboardScope` | Not overridable per instance |
| Ranking method | `DENSE_RANK` (always) | `DENSE_RANK` (always) |
| Score source | From Trivia Runtime | From Trivia Runtime (using instance scoring_mode) |

---

## 11. Key Files Reference

| File | Role |
|------|------|
| `supabase/functions/bizgamez-webhook/index.ts` | Ingests `game_complete` events; stores raw scores in `campaign_leaderboards` |
| `src/components/admin/TriviaCampaignBuilder.jsx` | Campaign-level settings editor; triggers finalization |
| `src/components/admin/trivia/GameInstanceForm.jsx` | Instance create/edit form; calls `syncToRuntime()` |
| `src/components/admin/trivia/GameInstanceList.jsx` | Instance list; shows status and finalization state |
| `src/components/admin/trivia/TriviaRewardConfig.jsx` | Creates/edits reward tiers with scope selection |
| `src/components/admin/trivia/TriviaRewardAssignments.jsx` | Views and issues reward assignments post-finalization |
| `src/components/admin/trivia/GameLaunchQRModal.jsx` | Generates QR codes embedding instance launch URLs |
| `src/utils/triviaUrlGenerator.js` | Builds launch URLs with embedded `instance_id` |
| `supabase/migrations/20260326155157_add_finalize_instance_function.sql` | `finalize_game_instance()` SQL function |
| `supabase/migrations/20260326155242_add_finalize_campaign_function.sql` | `finalize_trivia_campaign()` SQL function |
| `supabase/migrations/20260326154934_add_trivia_rewards_tables.sql` | `trivia_rewards` and `trivia_reward_assignments` schema |
| `supabase/migrations/20260326125216_add_trivia_support_phase3_campaign_game_instances.sql` | `campaign_game_instances` schema |
