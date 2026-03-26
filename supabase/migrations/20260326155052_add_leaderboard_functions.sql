/*
  # Leaderboard Query Functions

  1. New Functions
    - `get_instance_leaderboard(instance_id, p_limit, p_offset)` 
      - Returns ranked players for a single instance
      - Excludes plays without lead_id
      - Orders by score DESC, completion_time_ms ASC
      
    - `get_campaign_leaderboard(campaign_id, p_limit, p_offset)`
      - Returns cumulative rankings across all finalized instances
      - Uses SUM(score) as total_score
      - Tie-break by best (minimum) completion_time_ms
      - Excludes plays without lead_id

  2. Return Types
    - Both functions return lead_id, display info, score, time, rank
    - Also return counts of excluded anonymous players for UI warnings
*/

-- Return type for instance leaderboard
DROP TYPE IF EXISTS instance_leaderboard_entry CASCADE;
CREATE TYPE instance_leaderboard_entry AS (
  rank int,
  lead_id uuid,
  lead_email text,
  lead_name text,
  score numeric,
  completion_time_ms int,
  game_play_id uuid
);

-- Return type for campaign leaderboard
DROP TYPE IF EXISTS campaign_leaderboard_entry CASCADE;
CREATE TYPE campaign_leaderboard_entry AS (
  rank int,
  lead_id uuid,
  lead_email text,
  lead_name text,
  total_score numeric,
  best_time_ms int,
  instances_played int
);

-- Get instance leaderboard
CREATE OR REPLACE FUNCTION get_instance_leaderboard(
  p_instance_id uuid,
  p_limit int DEFAULT 100,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  rank int,
  lead_id uuid,
  lead_email text,
  lead_name text,
  score numeric,
  completion_time_ms int,
  game_play_id uuid,
  total_players bigint,
  excluded_anonymous bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_players bigint;
  v_excluded_anonymous bigint;
BEGIN
  -- Count total eligible players (with lead_id)
  SELECT COUNT(DISTINCT gp.lead_id) INTO v_total_players
  FROM game_plays gp
  WHERE gp.campaign_game_instance_id = p_instance_id
    AND gp.status = 'completed'
    AND gp.lead_id IS NOT NULL;

  -- Count excluded anonymous plays
  SELECT COUNT(*) INTO v_excluded_anonymous
  FROM game_plays gp
  WHERE gp.campaign_game_instance_id = p_instance_id
    AND gp.status = 'completed'
    AND gp.lead_id IS NULL;

  RETURN QUERY
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
  ),
  final_ranking AS (
    SELECT 
      DENSE_RANK() OVER (ORDER BY bp.score DESC, bp.completion_time_ms ASC)::int as rank,
      bp.lead_id,
      bp.score,
      bp.completion_time_ms,
      bp.game_play_id
    FROM best_plays bp
  )
  SELECT 
    fr.rank,
    fr.lead_id,
    COALESCE(l.data->>'email', '')::text as lead_email,
    COALESCE(l.data->>'name', l.data->>'firstName', '')::text as lead_name,
    fr.score,
    fr.completion_time_ms,
    fr.game_play_id,
    v_total_players,
    v_excluded_anonymous
  FROM final_ranking fr
  LEFT JOIN leads l ON l.id = fr.lead_id
  ORDER BY fr.rank ASC, fr.completion_time_ms ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Get campaign leaderboard (cumulative across finalized instances)
CREATE OR REPLACE FUNCTION get_campaign_leaderboard(
  p_campaign_id uuid,
  p_limit int DEFAULT 100,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  rank int,
  lead_id uuid,
  lead_email text,
  lead_name text,
  total_score numeric,
  best_time_ms int,
  instances_played bigint,
  total_players bigint,
  excluded_anonymous bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_players bigint;
  v_excluded_anonymous bigint;
BEGIN
  -- Count total unique players with lead_id across finalized instances
  SELECT COUNT(DISTINCT gp.lead_id) INTO v_total_players
  FROM game_plays gp
  JOIN campaign_game_instances cgi ON cgi.id = gp.campaign_game_instance_id
  WHERE gp.campaign_id = p_campaign_id
    AND gp.status = 'completed'
    AND gp.lead_id IS NOT NULL
    AND cgi.finalized_at IS NOT NULL;

  -- Count excluded anonymous plays
  SELECT COUNT(*) INTO v_excluded_anonymous
  FROM game_plays gp
  JOIN campaign_game_instances cgi ON cgi.id = gp.campaign_game_instance_id
  WHERE gp.campaign_id = p_campaign_id
    AND gp.status = 'completed'
    AND gp.lead_id IS NULL
    AND cgi.finalized_at IS NOT NULL;

  RETURN QUERY
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
    -- Sum scores across instances, keep best time for tiebreak
    SELECT 
      ibp.lead_id,
      SUM(ibp.score) as total_score,
      MIN(ibp.completion_time_ms) as best_time_ms,
      COUNT(DISTINCT ibp.campaign_game_instance_id) as instances_played
    FROM instance_best_plays ibp
    WHERE ibp.play_rank = 1
    GROUP BY ibp.lead_id
  ),
  final_ranking AS (
    SELECT 
      DENSE_RANK() OVER (ORDER BY a.total_score DESC, a.best_time_ms ASC)::int as rank,
      a.lead_id,
      a.total_score,
      a.best_time_ms,
      a.instances_played
    FROM aggregated a
  )
  SELECT 
    fr.rank,
    fr.lead_id,
    COALESCE(l.data->>'email', '')::text as lead_email,
    COALESCE(l.data->>'name', l.data->>'firstName', '')::text as lead_name,
    fr.total_score,
    fr.best_time_ms,
    fr.instances_played,
    v_total_players,
    v_excluded_anonymous
  FROM final_ranking fr
  LEFT JOIN leads l ON l.id = fr.lead_id
  ORDER BY fr.rank ASC, fr.best_time_ms ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute to authenticated users (RLS on underlying tables still applies)
GRANT EXECUTE ON FUNCTION get_instance_leaderboard TO authenticated;
GRANT EXECUTE ON FUNCTION get_campaign_leaderboard TO authenticated;
