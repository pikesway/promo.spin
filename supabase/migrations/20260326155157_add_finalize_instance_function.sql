/*
  # Finalize Game Instance Function

  1. Purpose
    - Finalizes a game instance by computing leaderboard and assigning rewards
    - Marks instance as completed if currently active/paused
    - Idempotent: returns existing data if already finalized
    - Excludes anonymous players (no lead_id)

  2. Logic
    - Validate instance exists
    - If already finalized, return existing summary
    - If active/paused, mark as completed
    - Compute instance leaderboard with dense ranking
    - Match winners to configured instance-scope rewards
    - Create trivia_reward_assignments for winners
    - Set finalized_at and finalized_by

  3. Return Type
    - Success status
    - Players ranked count
    - Anonymous excluded count
    - Rewards assigned count
    - Error message if any
*/

-- Return type for finalization result
DROP TYPE IF EXISTS finalization_result CASCADE;
CREATE TYPE finalization_result AS (
  success boolean,
  already_finalized boolean,
  players_ranked int,
  anonymous_excluded int,
  rewards_assigned int,
  error_message text
);

-- Finalize game instance function
CREATE OR REPLACE FUNCTION finalize_game_instance(p_instance_id uuid)
RETURNS finalization_result
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result finalization_result;
  v_instance record;
  v_user_id uuid;
  v_players_ranked int := 0;
  v_anonymous_excluded int := 0;
  v_rewards_assigned int := 0;
  v_reward record;
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

  -- Lock and fetch instance
  SELECT cgi.*, c.client_id, c.type as campaign_type
  INTO v_instance
  FROM campaign_game_instances cgi
  JOIN campaigns c ON c.id = cgi.campaign_id
  WHERE cgi.id = p_instance_id
  FOR UPDATE OF cgi;

  IF v_instance IS NULL THEN
    v_result.error_message := 'Instance not found';
    RETURN v_result;
  END IF;

  -- Verify user has access (admin or same client)
  IF NOT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = v_user_id
    AND (p.role = 'admin' OR (p.role = 'client_admin' AND p.client_id = v_instance.client_id))
  ) THEN
    v_result.error_message := 'Access denied';
    RETURN v_result;
  END IF;

  -- Check if already finalized (idempotent)
  IF v_instance.finalized_at IS NOT NULL THEN
    v_result.success := true;
    v_result.already_finalized := true;
    
    -- Return existing counts
    SELECT COUNT(DISTINCT lead_id)::int INTO v_result.players_ranked
    FROM trivia_reward_assignments
    WHERE instance_id = p_instance_id;
    
    SELECT COUNT(*)::int INTO v_result.rewards_assigned
    FROM trivia_reward_assignments
    WHERE instance_id = p_instance_id;
    
    RETURN v_result;
  END IF;

  -- If instance is active or paused, mark as completed
  IF v_instance.status IN ('active', 'paused', 'scheduled', 'draft') THEN
    UPDATE campaign_game_instances
    SET status = 'completed'
    WHERE id = p_instance_id;
  END IF;

  -- Count anonymous plays that will be excluded
  SELECT COUNT(*)::int INTO v_anonymous_excluded
  FROM game_plays gp
  WHERE gp.campaign_game_instance_id = p_instance_id
    AND gp.status = 'completed'
    AND gp.lead_id IS NULL;

  -- Compute leaderboard and assign rewards
  -- First, create a temp table with rankings
  CREATE TEMP TABLE temp_instance_rankings ON COMMIT DROP AS
  WITH ranked_plays AS (
    SELECT 
      gp.lead_id,
      gp.score,
      gp.completion_time_ms,
      gp.id as game_play_id,
      ROW_NUMBER() OVER (
        PARTITION BY gp.lead_id 
        ORDER BY gp.score DESC, gp.completion_time_ms ASC
      ) as play_rank
    FROM game_plays gp
    WHERE gp.campaign_game_instance_id = p_instance_id
      AND gp.status = 'completed'
      AND gp.lead_id IS NOT NULL
  ),
  best_plays AS (
    SELECT * FROM ranked_plays WHERE play_rank = 1
  )
  SELECT 
    DENSE_RANK() OVER (ORDER BY bp.score DESC, bp.completion_time_ms ASC)::int as rank,
    bp.lead_id,
    bp.score,
    bp.completion_time_ms,
    bp.game_play_id
  FROM best_plays bp;

  -- Get count of ranked players
  SELECT COUNT(*)::int INTO v_players_ranked FROM temp_instance_rankings;

  -- Process each active reward for this instance
  FOR v_reward IN
    SELECT tr.*
    FROM trivia_rewards tr
    WHERE tr.instance_id = p_instance_id
      AND tr.scope = 'instance'
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
      tir.lead_id,
      tir.game_play_id,
      p_instance_id,
      v_instance.campaign_id,
      tir.rank,
      tir.score,
      'pending'
    FROM temp_instance_rankings tir
    WHERE tir.rank >= v_reward.rank_min
      AND tir.rank <= v_reward.rank_max
      AND (v_reward.quantity_limit IS NULL OR 
           tir.rank - v_reward.rank_min + 1 <= v_reward.quantity_limit)
    ON CONFLICT (trivia_reward_id, lead_id, instance_id) DO NOTHING;
  END LOOP;

  -- Get final rewards count
  SELECT COUNT(*)::int INTO v_rewards_assigned
  FROM trivia_reward_assignments
  WHERE instance_id = p_instance_id;

  -- Mark instance as finalized
  UPDATE campaign_game_instances
  SET finalized_at = NOW(),
      finalized_by = v_user_id
  WHERE id = p_instance_id;

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
GRANT EXECUTE ON FUNCTION finalize_game_instance TO authenticated;
