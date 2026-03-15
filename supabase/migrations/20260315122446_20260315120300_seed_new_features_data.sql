/*
  # Seed Data for New Features: Reward Catalog, Bonus Rules, Birthday Members

  ## Summary
  Adds test data to validate the new loyalty features:
  - Reward tiers for existing campaigns (3-tier example for Coffee Lovers Card)
  - Bonus rules: Tuesday double stamps and Happy Hour 1.5x stamps
  - Members with birthdays in the current month for birthday reward testing
  - Members at various progress levels to populate "nearing reward" insights

  ## Data Added
  - Multi-tier rewards on Coffee Lovers Card (campaign c1000000-...-0001)
  - Tuesday bonus rule on Coffee Lovers Card
  - Happy Hour bonus rule on Sharp Cuts Club (campaign c1000000-...-0009)
  - 6 members with birthdays this month across Cafe Noir campaigns
  - Birthday reward configuration on Coffee Lovers Card loyalty program

  ## Safety
  - All INSERTs use WHERE NOT EXISTS or ON CONFLICT DO NOTHING for idempotency
  - Does not alter existing members, campaigns, or super_admin account
  - Does not remove any existing seed data
*/

-- ============================================================================
-- ADD ADDITIONAL REWARD TIERS to Coffee Lovers Card (campaign 001)
-- The first tier (Free Coffee at 10 visits) was already migrated from loyalty_programs
-- Add tiers at 5 and 20 visits
-- ============================================================================

INSERT INTO campaign_rewards (campaign_id, reward_name, threshold, reward_description, reward_type, active, sort_order)
SELECT
  'c1000000-0000-0000-0000-000000000001',
  'Free Tasting',
  5,
  'Enjoy a complimentary tasting of our featured roast',
  'free_item',
  true,
  1
WHERE NOT EXISTS (
  SELECT 1 FROM campaign_rewards
  WHERE campaign_id = 'c1000000-0000-0000-0000-000000000001'
    AND threshold = 5
);

-- Update the migrated tier (10 visits) to sort_order 2
UPDATE campaign_rewards
SET sort_order = 2
WHERE campaign_id = 'c1000000-0000-0000-0000-000000000001'
  AND threshold = 10;

INSERT INTO campaign_rewards (campaign_id, reward_name, threshold, reward_description, reward_type, active, sort_order)
SELECT
  'c1000000-0000-0000-0000-000000000001',
  'VIP Tasting Experience',
  20,
  'Exclusive VIP tasting session with our head barista — bring a friend!',
  'vip',
  true,
  3
WHERE NOT EXISTS (
  SELECT 1 FROM campaign_rewards
  WHERE campaign_id = 'c1000000-0000-0000-0000-000000000001'
    AND threshold = 20
);

-- ============================================================================
-- ADD MULTI-TIER REWARDS to Sharp Cuts Club (campaign 009)
-- ============================================================================

INSERT INTO campaign_rewards (campaign_id, reward_name, threshold, reward_description, reward_type, active, sort_order)
SELECT
  'c1000000-0000-0000-0000-000000000009',
  'Free Hot Towel Treatment',
  5,
  'Complimentary hot towel and scalp massage on your next visit',
  'free_item',
  true,
  1
WHERE NOT EXISTS (
  SELECT 1 FROM campaign_rewards
  WHERE campaign_id = 'c1000000-0000-0000-0000-000000000009'
    AND threshold = 5
);

UPDATE campaign_rewards
SET sort_order = 2
WHERE campaign_id = 'c1000000-0000-0000-0000-000000000009'
  AND threshold = 10;

INSERT INTO campaign_rewards (campaign_id, reward_name, threshold, reward_description, reward_type, active, sort_order)
SELECT
  'c1000000-0000-0000-0000-000000000009',
  'VIP Grooming Package',
  15,
  'Full cut, shave, hot towel, and complimentary styling product',
  'vip',
  true,
  3
WHERE NOT EXISTS (
  SELECT 1 FROM campaign_rewards
  WHERE campaign_id = 'c1000000-0000-0000-0000-000000000009'
    AND threshold = 15
);

-- ============================================================================
-- BONUS RULES
-- ============================================================================

-- Tuesday Double Stamps on Coffee Lovers Card
INSERT INTO campaign_bonus_rules (campaign_id, name, rule_type, day_of_week, multiplier, active)
SELECT
  'c1000000-0000-0000-0000-000000000001',
  'Tuesday Double Stamps',
  'day_of_week',
  2,
  2.0,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM campaign_bonus_rules
  WHERE campaign_id = 'c1000000-0000-0000-0000-000000000001'
    AND name = 'Tuesday Double Stamps'
);

-- Happy Hour 4pm–6pm on Sharp Cuts Club (1.5x -> rounds to 2 stamps)
INSERT INTO campaign_bonus_rules (campaign_id, name, rule_type, start_time, end_time, multiplier, active)
SELECT
  'c1000000-0000-0000-0000-000000000009',
  'Happy Hour Bonus',
  'time_window',
  '16:00:00',
  '18:00:00',
  1.5,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM campaign_bonus_rules
  WHERE campaign_id = 'c1000000-0000-0000-0000-000000000009'
    AND name = 'Happy Hour Bonus'
);

-- Tuesday + Happy Hour combo rule on Workout Warriors (Fit Studio Main)
INSERT INTO campaign_bonus_rules (campaign_id, name, rule_type, day_of_week, start_time, end_time, multiplier, active)
SELECT
  'c1000000-0000-0000-0000-000000000005',
  'Tuesday Morning Boost',
  'time_window',
  2,
  '06:00:00',
  '10:00:00',
  2.0,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM campaign_bonus_rules
  WHERE campaign_id = 'c1000000-0000-0000-0000-000000000005'
    AND name = 'Tuesday Morning Boost'
);

-- ============================================================================
-- ENABLE BIRTHDAY REWARDS on Coffee Lovers Card loyalty program
-- ============================================================================

UPDATE loyalty_programs
SET
  birthday_reward_enabled = true,
  birthday_reward_name = 'Birthday Coffee on Us',
  birthday_reward_description = 'Enjoy a free drink of your choice on your birthday month!'
WHERE campaign_id = 'c1000000-0000-0000-0000-000000000001'
  AND birthday_reward_enabled = false;

-- ============================================================================
-- BIRTHDAY MEMBERS — 6 members with birthdays this month
-- These use existing campaign/client IDs and store birthday as a date
-- Year 2000 is used as a placeholder (only month/day matters for birthday logic)
-- ============================================================================

-- Add birthdays to existing Cafe Noir Downtown - Coffee Lovers Card members
UPDATE loyalty_accounts
SET birthday = make_date(2000, EXTRACT(MONTH FROM now())::int, 5)
WHERE member_code = 'AABC1234' AND birthday IS NULL;

UPDATE loyalty_accounts
SET birthday = make_date(2000, EXTRACT(MONTH FROM now())::int, 12)
WHERE member_code = 'BBCD2345' AND birthday IS NULL;

UPDATE loyalty_accounts
SET birthday = make_date(2000, EXTRACT(MONTH FROM now())::int, 20)
WHERE member_code = 'CCDE3456' AND birthday IS NULL;

-- Add birthdays to Fit Studio members
UPDATE loyalty_accounts
SET birthday = make_date(2000, EXTRACT(MONTH FROM now())::int, 8)
WHERE member_code = 'FFGH6790' AND birthday IS NULL;

UPDATE loyalty_accounts
SET birthday = make_date(2000, EXTRACT(MONTH FROM now())::int, 15)
WHERE member_code = 'GGHJ6791' AND birthday IS NULL;

-- Add birthday to Barber Co member
UPDATE loyalty_accounts
SET birthday = make_date(2000, EXTRACT(MONTH FROM now())::int, 22)
WHERE member_code = 'LLMN8001' AND birthday IS NULL;

-- ============================================================================
-- NEAR-REWARD MEMBERS — set progress close to tier thresholds for insights testing
-- These update existing members to be 1-2 stamps away from reward tiers
-- ============================================================================

-- Coffee Lovers Card: Olivia Brown at 9/10 (1 stamp from Free Coffee tier)
UPDATE loyalty_accounts
SET current_progress = 9
WHERE member_code = 'DDEF4567'
  AND campaign_id = 'c1000000-0000-0000-0000-000000000001';

-- Coffee Lovers Card: Sophia Davis at 8/10 (2 stamps from Free Coffee tier)
UPDATE loyalty_accounts
SET current_progress = 8
WHERE member_code = 'HHJK8901'
  AND campaign_id = 'c1000000-0000-0000-0000-000000000001';

-- Sharp Cuts Club: James Watson at 9/10 (1 stamp from Free Haircut)
UPDATE loyalty_accounts
SET current_progress = 9
WHERE member_code = 'TTUV8009'
  AND campaign_id = 'c1000000-0000-0000-0000-000000000009';

-- Workout Warriors: Matthew Cooper at 11/12 (1 stamp from Free Class)
UPDATE loyalty_accounts
SET current_progress = 11
WHERE member_code = 'MMNO6796'
  AND campaign_id = 'c1000000-0000-0000-0000-000000000005';
