/*
  # Finalize Trivia Campaign Function

  1. Purpose
    - Finalizes a trivia campaign by computing aggregate leaderboard and assigning campaign-level rewards
    - Uses cumulative scoring: SUM(score) across all finalized instances
    - Tie-break by best (minimum) completion_time_ms
    - Excludes anonymous players (no lead_id)
    - Idempotent: returns existing data if already finalized

  2. Logic
    - Validate campaign exists and is type = 'trivia'
    - If already finalized, return existing summary
    - Compute campaign leaderboard (cumulative across finalized instances)
    - Match winners to configured campaign-scope rewards
    - Create trivia_reward_assignments for campaign-level winners
    - Set campaign finalized_at and finalized_by

  3. Return Type
    - Uses same finalization_result type as instance finalization
*/

-- Finalize trivia campaign function
CREATE OR REPLACE FUNCTION finalize_trivia_campaign(p_campaign_id uuid)
RETURNS finalization_result
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result finalization_result;
  v_campaign record;
  v_user_id uuid;
  v_players_ranked int := 0;
  v_anonymous_excluded int := 0;
  v_rewards_assigned int := 0;
  v_reward record;
  v_finalized_instance_count int;
  v_total_instance_count int;
BEGIN
  -- Initialize result
  v_result.success := false;
  v_result.already_finalized := false;
  v_result.players_ranked := 0;
  v_result.anonymous_excluded := 0;
  v_result.rewards_assigned := 0;
  v_result.error_message := NULL;

  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    v_result.error_message := 'Not authenticated';
    RETURN v_result;
  END IF;

  -- Lock and fetch campaign
  SELECT c.*
  INTO v_campaign
  FROM campaigns c
  WHERE c.id = p_campaign_id
  FOR UPDATE;

  IF v_campaign IS NULL THEN
    v_result.error_message := 'Campaign not found';
    RETURN v_result;
  END IF;

  -- Verify campaign type is trivia
  IF v_campaign.type != 'trivia' THEN
    v_result.error_message := 'Campaign is not a trivia campaign';
    RETURN v_result;
  END IF;

  -- Verify user has access (admin or same client)
  IF NOT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = v_user_id
    AND (p.role = 'admin' OR (p.role = 'client_admin' AND p.client_id = v_campaign.client_id))
  ) THEN
    v_result.error_message := 'Access denied';
    RETURN v_result;
  END IF;

  -- Check if already finalized (idempotent)
  IF v_campaign.finalized_at IS NOT NULL THEN
    v_result.success := true;
    v_result.already_finalized := true;
    
    -- Return existing counts
    SELECT COUNT(DISTINCT lead_id)::int INTO v_result.players_ranked
    FROM trivia_reward_assignments
    WHERE campaign_id = p_campaign_id
      AND instance_id IS NULL;
    
    SELECT COUNT(*)::int INTO v_result.rewards_assigned
    FROM trivia_reward_assignments
    WHERE campaign_id = p_campaign_id
      AND instance_id IS NULL;
    
    RETURN v_result;
  END IF;

  -- Check instance finalization status
  SELECT 
    COUNT(*)::int,
    COUNT(*) FILTER (WHERE finalized_at IS NOT NULL)::int
  INTO v_total_instance_count, v_finalized_instance_count
  FROM campaign_game_instances
  WHERE campaign_id = p_campaign_id
    AND status != 'archived';

  -- Note: We allow finalization even if not all instances are finalized
  -- The caller can decide whether to proceed based on this info

  -- Count anonymous plays that will be excluded
  SELECT COUNT(*)::int INTO v_anonymous_excluded
  FROM game_plays gp
  JOIN campaign_game_instances cgi ON cgi.id = gp.campaign_game_instance_id
  WHERE gp.campaign_id = p_campaign_id
    AND gp.status = 'completed'
    AND gp.lead_id IS NULL
    AND cgi.finalized_at IS NOT NULL;

  -- Compute cumulative leaderboard and create temp table
  CREATE TEMP TABLE temp_campaign_rankings ON COMMIT DROP AS
  WITH instance_best_plays AS (
    -- Get each lead's best play per instance
    SELECT 
      gp.lead_id,
      gp.campaign_game_instance_id,
      gp.score,
      gp.completion_time_ms,
      ROW_NUMBER() OVER (
        PARTITION BY gp.lead_id, gp.campaign_game_instance_id
        ORDER BY gp.score DESC, gp.completion_time_ms ASC
      ) as play_rank
    FROM game_plays gp
    JOIN campaign_game_instances cgi ON cgi.id = gp.campaign_game_instance_id
    WHERE gp.campaign_id = p_campaign_id
      AND gp.status = 'completed'
      AND gp.lead_id IS NOT NULL
      AND cgi.finalized_at IS NOT NULL
  ),
  aggregated AS (
    -- Sum scores across instances (cumulative), keep best time for tiebreak
    SELECT 
      ibp.lead_id,
      SUM(ibp.score) as total_score,
      MIN(ibp.completion_time_ms) as best_time_ms,
      COUNT(DISTINCT ibp.campaign_game_instance_id) as instances_played
    FROM instance_best_plays ibp
    WHERE ibp.play_rank = 1
    GROUP BY ibp.lead_id
  )
  SELECT 
    DENSE_RANK() OVER (ORDER BY a.total_score DESC, a.best_time_ms ASC)::int as rank,
    a.lead_id,
    a.total_score as score,
    a.best_time_ms,
    a.instances_played
  FROM aggregated a;

  -- Get count of ranked players
  SELECT COUNT(*)::int INTO v_players_ranked FROM temp_campaign_rankings;

  -- Process each active campaign-level reward
  FOR v_reward IN
    SELECT tr.*
    FROM trivia_rewards tr
    WHERE tr.campaign_id = p_campaign_id
      AND tr.scope = 'campaign'
      AND tr.instance_id IS NULL
      AND tr.active = true
    ORDER BY tr.rank_min ASC
  LOOP
    -- Assign rewards to players in rank range
    INSERT INTO trivia_reward_assignments (
      trivia_reward_id,
      lead_id,
      game_play_id,
      instance_id,
      campaign_id,
      rank_achieved,
      score_achieved,
      status
    )
    SELECT 
      v_reward.id,
      tcr.lead_id,
      NULL,
      NULL,
      p_campaign_id,
      tcr.rank,
      tcr.score,
      'pending'
    FROM temp_campaign_rankings tcr
    WHERE tcr.rank >= v_reward.rank_min
      AND tcr.rank <= v_reward.rank_max
      AND (v_reward.quantity_limit IS NULL OR 
           tcr.rank - v_reward.rank_min + 1 <= v_reward.quantity_limit)
    ON CONFLICT (trivia_reward_id, lead_id, campaign_id) DO NOTHING;
  END LOOP;

  -- Get final rewards count
  SELECT COUNT(*)::int INTO v_rewards_assigned
  FROM trivia_reward_assignments
  WHERE campaign_id = p_campaign_id
    AND instance_id IS NULL;

  -- Mark campaign as finalized
  UPDATE campaigns
  SET finalized_at = NOW(),
      finalized_by = v_user_id
  WHERE id = p_campaign_id;

  -- Set result
  v_result.success := true;
  v_result.already_finalized := false;
  v_result.players_ranked := v_players_ranked;
  v_result.anonymous_excluded := v_anonymous_excluded;
  v_result.rewards_assigned := v_rewards_assigned;

  RETURN v_result;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION finalize_trivia_campaign TO authenticated;
