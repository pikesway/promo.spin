/*
  # Migrate Existing Single Rewards to Campaign Rewards Catalog

  ## Summary
  For every loyalty_programs row that has a reward_name and threshold defined,
  this migration creates a corresponding row in campaign_rewards as the first/default
  reward tier (sort_order = 1). This ensures all existing campaigns immediately have
  a populated reward catalog without any manual data entry.

  ## Safety
  - Uses INSERT ... WHERE NOT EXISTS to be idempotent
  - Does NOT alter or remove any existing loyalty_programs data
  - The original threshold, reward_name, and reward_description remain untouched
    on loyalty_programs as a fallback for edge functions until fully migrated
  - Only migrates programs with a non-null, non-empty reward_name

  ## Result
  After this migration, every active campaign with a loyalty program will have
  at least one entry in campaign_rewards. The existing single-threshold behavior
  is preserved as "Tier 1".
*/

INSERT INTO campaign_rewards (campaign_id, reward_name, threshold, reward_description, reward_type, active, sort_order)
SELECT
  lp.campaign_id,
  COALESCE(NULLIF(lp.reward_name, ''), 'Reward') AS reward_name,
  lp.threshold,
  COALESCE(lp.reward_description, '') AS reward_description,
  'custom' AS reward_type,
  true AS active,
  1 AS sort_order
FROM loyalty_programs lp
WHERE lp.reward_name IS NOT NULL
  AND lp.reward_name != ''
  AND lp.threshold IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM campaign_rewards cr
    WHERE cr.campaign_id = lp.campaign_id
  );
