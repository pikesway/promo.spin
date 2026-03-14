/*
  # Seed Data for Testing

  ## Summary
  Creates realistic seed data for testing the new Agency > Client > Brand > Campaign hierarchy.

  ## Data Created
  - 3 clients: Cafe Noir, Fit Studio, The Barber Co
  - 2-3 brands per client with own branding and unlock_pin
  - 12 loyalty campaigns across brands
  - ~80 loyalty members with varied progress across active campaigns
  - Activity log entries
  - Leads per active campaign

  ## Note
  Auth users for client_admin / client_user must be created via the admin UI or admin-users edge function.
  Profile records will be linked once auth users are created.
*/

-- ============================================================================
-- CLIENTS
-- ============================================================================

INSERT INTO clients (id, name, email, logo_url, primary_color, secondary_color, background_color, status, active_brands_limit, active_users_limit, active_campaigns_limit)
VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Cafe Noir', 'admin@cafenoir.com', null, '#B45309', '#92400E', '#1C1208', 'active', 5, 10, 20),
  ('a1000000-0000-0000-0000-000000000002', 'Fit Studio', 'admin@fitstudio.com', null, '#0891B2', '#0E7490', '#081217', 'active', 5, 10, 20),
  ('a1000000-0000-0000-0000-000000000003', 'The Barber Co', 'admin@barberco.com', null, '#374151', '#1F2937', '#0D0F11', 'active', 3, 8, 15);

-- ============================================================================
-- BRANDS
-- ============================================================================

INSERT INTO brands (id, client_id, name, primary_color, secondary_color, background_color, unlock_pin, loyalty_members_limit, active)
VALUES
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Cafe Noir Downtown', '#B45309', '#92400E', '#1C1208', '1234', 200, true),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'Cafe Noir Airport', '#D97706', '#B45309', '#1C1208', '5678', 150, true),
  ('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000002', 'Fit Studio Main', '#0891B2', '#0E7490', '#081217', '2468', 300, true),
  ('b1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000002', 'Fit Studio Eastside', '#06B6D4', '#0891B2', '#081217', '1357', 250, true),
  ('b1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000003', 'The Barber Co Classic', '#374151', '#1F2937', '#0D0F11', '9999', 100, true),
  ('b1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000003', 'The Barber Co Premium', '#6B7280', '#374151', '#0D0F11', '8888', 80, true);

-- ============================================================================
-- CAMPAIGNS (2 per brand, loyalty type, brand_id set - client_id auto via trigger)
-- ============================================================================

INSERT INTO campaigns (id, brand_id, name, slug, type, status, config)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'Coffee Lovers Card', 'cafe-noir-downtown-coffee', 'loyalty', 'active', '{}'),
  ('c1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'Pastry Passport', 'cafe-noir-downtown-pastry', 'loyalty', 'active', '{}'),
  ('c1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000002', 'Frequent Flyer Coffee', 'cafe-noir-airport-coffee', 'loyalty', 'active', '{}'),
  ('c1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000002', 'Express Loyalty', 'cafe-noir-airport-express', 'loyalty', 'draft', '{}'),
  ('c1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000003', 'Workout Warriors', 'fit-studio-main-warriors', 'loyalty', 'active', '{}'),
  ('c1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000003', 'Class Credits', 'fit-studio-main-credits', 'loyalty', 'active', '{}'),
  ('c1000000-0000-0000-0000-000000000007', 'b1000000-0000-0000-0000-000000000004', 'East Side Strong', 'fit-studio-east-strong', 'loyalty', 'active', '{}'),
  ('c1000000-0000-0000-0000-000000000008', 'b1000000-0000-0000-0000-000000000004', 'Personal Training Pass', 'fit-studio-east-pt', 'loyalty', 'draft', '{}'),
  ('c1000000-0000-0000-0000-000000000009', 'b1000000-0000-0000-0000-000000000005', 'Sharp Cuts Club', 'barber-classic-cuts', 'loyalty', 'active', '{}'),
  ('c1000000-0000-0000-0000-000000000010', 'b1000000-0000-0000-0000-000000000005', 'Beard Masters', 'barber-classic-beard', 'loyalty', 'active', '{}'),
  ('c1000000-0000-0000-0000-000000000011', 'b1000000-0000-0000-0000-000000000006', 'VIP Grooming Pass', 'barber-premium-vip', 'loyalty', 'active', '{}'),
  ('c1000000-0000-0000-0000-000000000012', 'b1000000-0000-0000-0000-000000000006', 'Style Club', 'barber-premium-style', 'loyalty', 'draft', '{}');

-- ============================================================================
-- LOYALTY PROGRAMS
-- ============================================================================

INSERT INTO loyalty_programs (campaign_id, program_type, threshold, validation_method, validation_config, reward_name, reward_description, reset_behavior, lockout_threshold)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'visit', 10, 'pin', '{"pin": "4321"}', 'Free Coffee', 'Get a free coffee of your choice', 'reset', 3),
  ('c1000000-0000-0000-0000-000000000002', 'visit', 8,  'pin', '{"pin": "4321"}', 'Free Pastry', 'Get a free pastry of your choice', 'reset', 3),
  ('c1000000-0000-0000-0000-000000000003', 'visit', 10, 'pin', '{"pin": "8765"}', 'Airport Lounge Coffee', 'Free hot drink at any counter', 'reset', 3),
  ('c1000000-0000-0000-0000-000000000004', 'visit', 5,  'pin', '{"pin": "8765"}', 'Express Reward', 'Free grab-and-go item', 'reset', 3),
  ('c1000000-0000-0000-0000-000000000005', 'visit', 12, 'pin', '{"pin": "2468"}', 'Free Class', 'One free group fitness class', 'reset', 3),
  ('c1000000-0000-0000-0000-000000000006', 'visit', 10, 'pin', '{"pin": "2468"}', 'Class Credit', 'One class credit added to your account', 'rollover', 3),
  ('c1000000-0000-0000-0000-000000000007', 'visit', 12, 'pin', '{"pin": "1357"}', 'East Side Pass', 'Free drop-in class', 'reset', 3),
  ('c1000000-0000-0000-0000-000000000008', 'visit', 6,  'pin', '{"pin": "1357"}', 'PT Session', 'One personal training session', 'reset', 3),
  ('c1000000-0000-0000-0000-000000000009', 'visit', 10, 'pin', '{"pin": "9999"}', 'Free Haircut', 'One free standard haircut', 'reset', 3),
  ('c1000000-0000-0000-0000-000000000010', 'visit', 8,  'pin', '{"pin": "9999"}', 'Free Beard Trim', 'One free beard trim and style', 'reset', 3),
  ('c1000000-0000-0000-0000-000000000011', 'visit', 10, 'pin', '{"pin": "8888"}', 'VIP Treatment', 'Free premium grooming service', 'reset', 3),
  ('c1000000-0000-0000-0000-000000000012', 'visit', 12, 'pin', '{"pin": "8888"}', 'Style Session', 'Free full styling session', 'reset', 3);

-- ============================================================================
-- LOYALTY MEMBERS - Cafe Noir Downtown - Coffee Lovers Card
-- ============================================================================

INSERT INTO loyalty_accounts (campaign_id, client_id, email, name, phone, current_progress, total_visits, reward_unlocked, member_code, enrolled_at) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'james.smith@example.com', 'James Smith', '0412345001', 10, 12, true, 'AABC1234', now() - interval '60 days'),
  ('c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'emma.johnson@example.com', 'Emma Johnson', '0412345002', 7, 7, false, 'BBCD2345', now() - interval '45 days'),
  ('c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'liam.williams@example.com', 'Liam Williams', '0412345003', 4, 4, false, 'CCDE3456', now() - interval '30 days'),
  ('c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'olivia.brown@example.com', 'Olivia Brown', '0412345004', 9, 11, false, 'DDEF4567', now() - interval '55 days'),
  ('c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'noah.jones@example.com', 'Noah Jones', '0412345005', 10, 13, true, 'EEFG5678', now() - interval '70 days'),
  ('c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'ava.garcia@example.com', 'Ava Garcia', '0412345006', 2, 2, false, 'FFGH6789', now() - interval '10 days'),
  ('c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'william.miller@example.com', 'William Miller', '0412345007', 6, 6, false, 'GGHJ7890', now() - interval '40 days'),
  ('c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'sophia.davis@example.com', 'Sophia Davis', '0412345008', 8, 9, false, 'HHJK8901', now() - interval '50 days'),
  ('c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'ben.wilson@example.com', 'Benjamin Wilson', '0412345009', 3, 3, false, 'JJKL9012', now() - interval '20 days'),
  ('c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'isabella.taylor@example.com', 'Isabella Taylor', '0412345010', 10, 14, true, 'KKLM0123', now() - interval '80 days');

-- ============================================================================
-- LOYALTY MEMBERS - Cafe Noir Downtown - Pastry Passport
-- ============================================================================

INSERT INTO loyalty_accounts (campaign_id, client_id, email, name, phone, current_progress, total_visits, reward_unlocked, member_code, enrolled_at) VALUES
  ('c1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'lucas.moore@example.com', 'Lucas Moore', '0412345011', 8, 8, true, 'LLMN1234', now() - interval '40 days'),
  ('c1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'mia.anderson@example.com', 'Mia Anderson', '0412345012', 5, 5, false, 'MMNO2345', now() - interval '35 days'),
  ('c1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'henry.thomas@example.com', 'Henry Thomas', '0412345013', 3, 3, false, 'NNOP3456', now() - interval '25 days'),
  ('c1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'charlotte.jackson@example.com', 'Charlotte Jackson', '0412345014', 7, 8, false, 'OOPQ4567', now() - interval '50 days'),
  ('c1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'alex.white@example.com', 'Alexander White', '0412345015', 8, 9, true, 'PPQR5678', now() - interval '45 days'),
  ('c1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'amelia.harris@example.com', 'Amelia Harris', '0412345016', 1, 1, false, 'QQRS6789', now() - interval '5 days'),
  ('c1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'mason.martin@example.com', 'Mason Martin', '0412345017', 6, 6, false, 'RRST7890', now() - interval '30 days'),
  ('c1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'harper.thompson@example.com', 'Harper Thompson', '0412345018', 4, 4, false, 'SSTU8901', now() - interval '20 days'),
  ('c1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'ethan.robinson@example.com', 'Ethan Robinson', '0412345019', 8, 10, true, 'TTUV9012', now() - interval '55 days'),
  ('c1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'evelyn.clark@example.com', 'Evelyn Clark', '0412345020', 2, 2, false, 'UUVW0123', now() - interval '15 days');

-- ============================================================================
-- LOYALTY MEMBERS - Cafe Noir Airport - Frequent Flyer Coffee
-- ============================================================================

INSERT INTO loyalty_accounts (campaign_id, client_id, email, name, phone, current_progress, total_visits, reward_unlocked, member_code, enrolled_at) VALUES
  ('c1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'oliver.lewis@example.com', 'Oliver Lewis', '0412345021', 10, 11, true, 'VVWX1234', now() - interval '90 days'),
  ('c1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'emma.lee@example.com', 'Emma Lee', '0412345022', 6, 6, false, 'WWXY2345', now() - interval '40 days'),
  ('c1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'jack.walker@example.com', 'Jack Walker', '0412345023', 3, 3, false, 'XXYZ3456', now() - interval '20 days'),
  ('c1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'grace.hall@example.com', 'Grace Hall', '0412345024', 8, 9, false, 'YYZA4567', now() - interval '60 days'),
  ('c1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'ryan.allen@example.com', 'Ryan Allen', '0412345025', 10, 12, true, 'ZZAB5678', now() - interval '75 days'),
  ('c1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'zoe.young@example.com', 'Zoe Young', '0412345026', 2, 2, false, 'AABC5679', now() - interval '10 days'),
  ('c1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'daniel.king@example.com', 'Daniel King', '0412345027', 7, 7, false, 'BBCD5680', now() - interval '50 days'),
  ('c1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'chloe.wright@example.com', 'Chloe Wright', '0412345028', 5, 5, false, 'CCDE5681', now() - interval '35 days'),
  ('c1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'jayden.scott@example.com', 'Jayden Scott', '0412345029', 9, 10, false, 'DDEF5682', now() - interval '65 days'),
  ('c1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'lily.adams@example.com', 'Lily Adams', '0412345030', 10, 13, true, 'EEFG5683', now() - interval '80 days');

-- ============================================================================
-- LOYALTY MEMBERS - Fit Studio Main - Workout Warriors
-- ============================================================================

INSERT INTO loyalty_accounts (campaign_id, client_id, email, name, phone, current_progress, total_visits, reward_unlocked, member_code, enrolled_at) VALUES
  ('c1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000002', 'mike.reed@example.com', 'Mike Reed', '0412346001', 12, 14, true, 'FFGH6790', now() - interval '90 days'),
  ('c1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000002', 'jessica.cook@example.com', 'Jessica Cook', '0412346002', 9, 9, false, 'GGHJ6791', now() - interval '60 days'),
  ('c1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000002', 'david.morgan@example.com', 'David Morgan', '0412346003', 5, 5, false, 'HHJK6792', now() - interval '40 days'),
  ('c1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000002', 'sarah.bell@example.com', 'Sarah Bell', '0412346004', 12, 15, true, 'JJKL6793', now() - interval '85 days'),
  ('c1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000002', 'chris.murphy@example.com', 'Chris Murphy', '0412346005', 7, 7, false, 'KKLM6794', now() - interval '50 days'),
  ('c1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000002', 'ashley.rivera@example.com', 'Ashley Rivera', '0412346006', 3, 3, false, 'LLMN6795', now() - interval '25 days'),
  ('c1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000002', 'matt.cooper@example.com', 'Matthew Cooper', '0412346007', 11, 12, false, 'MMNO6796', now() - interval '70 days'),
  ('c1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000002', 'lauren.james@example.com', 'Lauren James', '0412346008', 8, 8, false, 'NNOP6797', now() - interval '55 days'),
  ('c1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000002', 'kevin.watson@example.com', 'Kevin Watson', '0412346009', 2, 2, false, 'OOPQ6798', now() - interval '15 days'),
  ('c1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000002', 'megan.brooks@example.com', 'Megan Brooks', '0412346010', 12, 16, true, 'PPQR6799', now() - interval '88 days');

-- ============================================================================
-- LOYALTY MEMBERS - Fit Studio Main - Class Credits
-- ============================================================================

INSERT INTO loyalty_accounts (campaign_id, client_id, email, name, phone, current_progress, total_visits, reward_unlocked, member_code, enrolled_at) VALUES
  ('c1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000002', 'tyler.gray@example.com', 'Tyler Gray', '0412346011', 10, 11, true, 'QQRS6800', now() - interval '75 days'),
  ('c1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000002', 'amanda.price@example.com', 'Amanda Price', '0412346012', 6, 6, false, 'RRST6801', now() - interval '45 days'),
  ('c1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000002', 'brandon.ward@example.com', 'Brandon Ward', '0412346013', 4, 4, false, 'SSTU6802', now() - interval '30 days'),
  ('c1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000002', 'stephanie.cox@example.com', 'Stephanie Cox', '0412346014', 8, 9, false, 'TTUV6803', now() - interval '55 days'),
  ('c1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000002', 'raymond.diaz@example.com', 'Raymond Diaz', '0412346015', 10, 12, true, 'UUVW6804', now() - interval '80 days'),
  ('c1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000002', 'amber.torres@example.com', 'Amber Torres', '0412346016', 2, 2, false, 'VVWX6805', now() - interval '12 days'),
  ('c1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000002', 'hunter.perry@example.com', 'Hunter Perry', '0412346017', 7, 7, false, 'WWXY6806', now() - interval '42 days'),
  ('c1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000002', 'brittany.hughes@example.com', 'Brittany Hughes', '0412346018', 5, 5, false, 'XXYZ6807', now() - interval '28 days'),
  ('c1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000002', 'derek.flores@example.com', 'Derek Flores', '0412346019', 9, 10, false, 'YYZA6808', now() - interval '62 days'),
  ('c1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000002', 'whitney.washington@example.com', 'Whitney Washington', '0412346020', 10, 13, true, 'ZZAB6809', now() - interval '85 days');

-- ============================================================================
-- LOYALTY MEMBERS - Fit Studio Eastside - East Side Strong
-- ============================================================================

INSERT INTO loyalty_accounts (campaign_id, client_id, email, name, phone, current_progress, total_visits, reward_unlocked, member_code, enrolled_at) VALUES
  ('c1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000002', 'patrick.butler@example.com', 'Patrick Butler', '0412346021', 12, 13, true, 'AABC7001', now() - interval '90 days'),
  ('c1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000002', 'lisa.simmons@example.com', 'Lisa Simmons', '0412346022', 8, 8, false, 'BBCD7002', now() - interval '55 days'),
  ('c1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000002', 'terry.foster@example.com', 'Terry Foster', '0412346023', 4, 4, false, 'CCDE7003', now() - interval '28 days'),
  ('c1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000002', 'donna.gonzales@example.com', 'Donna Gonzales', '0412346024', 11, 12, false, 'DDEF7004', now() - interval '70 days'),
  ('c1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000002', 'victor.nelson@example.com', 'Victor Nelson', '0412346025', 12, 14, true, 'EEFG7005', now() - interval '82 days'),
  ('c1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000002', 'diane.carter@example.com', 'Diane Carter', '0412346026', 1, 1, false, 'FFGH7006', now() - interval '7 days'),
  ('c1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000002', 'carl.mitchell@example.com', 'Carl Mitchell', '0412346027', 7, 7, false, 'GGHJ7007', now() - interval '48 days'),
  ('c1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000002', 'angela.perez@example.com', 'Angela Perez', '0412346028', 5, 5, false, 'HHJK7008', now() - interval '32 days'),
  ('c1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000002', 'jerome.roberts@example.com', 'Jerome Roberts', '0412346029', 9, 10, false, 'JJKL7009', now() - interval '65 days'),
  ('c1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000002', 'felicia.turner@example.com', 'Felicia Turner', '0412346030', 12, 15, true, 'KKLM7010', now() - interval '88 days');

-- ============================================================================
-- LOYALTY MEMBERS - The Barber Co Classic - Sharp Cuts Club
-- ============================================================================

INSERT INTO loyalty_accounts (campaign_id, client_id, email, name, phone, current_progress, total_visits, reward_unlocked, member_code, enrolled_at) VALUES
  ('c1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000003', 'alan.rogers@example.com', 'Alan Rogers', '0412347001', 10, 11, true, 'LLMN8001', now() - interval '90 days'),
  ('c1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000003', 'carl.reed@example.com', 'Carl Reed', '0412347002', 7, 7, false, 'MMNO8002', now() - interval '55 days'),
  ('c1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000003', 'sam.cook@example.com', 'Sam Cook', '0412347003', 3, 3, false, 'NNOP8003', now() - interval '25 days'),
  ('c1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000003', 'peter.morgan@example.com', 'Peter Morgan', '0412347004', 8, 9, false, 'OOPQ8004', now() - interval '60 days'),
  ('c1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000003', 'frank.bell@example.com', 'Frank Bell', '0412347005', 10, 12, true, 'PPQR8005', now() - interval '78 days'),
  ('c1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000003', 'george.murphy@example.com', 'George Murphy', '0412347006', 2, 2, false, 'QQRS8006', now() - interval '12 days'),
  ('c1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000003', 'henry.rivera@example.com', 'Henry Rivera', '0412347007', 6, 6, false, 'RRST8007', now() - interval '42 days'),
  ('c1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000003', 'ivan.cooper@example.com', 'Ivan Cooper', '0412347008', 5, 5, false, 'SSTU8008', now() - interval '35 days'),
  ('c1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000003', 'james.james@example.com', 'James Watson', '0412347009', 9, 10, false, 'TTUV8009', now() - interval '68 days'),
  ('c1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000003', 'kevin.brooks@example.com', 'Kevin Brooks', '0412347010', 10, 14, true, 'UUVW8010', now() - interval '85 days');

-- ============================================================================
-- LOYALTY MEMBERS - The Barber Co Classic - Beard Masters
-- ============================================================================

INSERT INTO loyalty_accounts (campaign_id, client_id, email, name, phone, current_progress, total_visits, reward_unlocked, member_code, enrolled_at) VALUES
  ('c1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000003', 'leo.gray@example.com', 'Leo Gray', '0412347011', 8, 9, true, 'VVWX9001', now() - interval '70 days'),
  ('c1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000003', 'marco.price@example.com', 'Marco Price', '0412347012', 5, 5, false, 'WWXY9002', now() - interval '40 days'),
  ('c1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000003', 'neil.ward@example.com', 'Neil Ward', '0412347013', 3, 3, false, 'XXYZ9003', now() - interval '22 days'),
  ('c1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000003', 'oscar.cox@example.com', 'Oscar Cox', '0412347014', 7, 8, false, 'YYZA9004', now() - interval '55 days'),
  ('c1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000003', 'paul.diaz@example.com', 'Paul Diaz', '0412347015', 8, 10, true, 'ZZAB9005', now() - interval '75 days'),
  ('c1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000003', 'quinn.torres@example.com', 'Quinn Torres', '0412347016', 1, 1, false, 'AABC9006', now() - interval '5 days'),
  ('c1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000003', 'ross.perry@example.com', 'Ross Perry', '0412347017', 6, 6, false, 'BBCD9007', now() - interval '38 days'),
  ('c1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000003', 'stan.hughes@example.com', 'Stan Hughes', '0412347018', 4, 4, false, 'CCDE9008', now() - interval '28 days'),
  ('c1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000003', 'tom.flores@example.com', 'Tom Flores', '0412347019', 8, 9, true, 'DDEF9009', now() - interval '62 days'),
  ('c1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000003', 'uri.washington@example.com', 'Uri Washington', '0412347020', 2, 2, false, 'EEFG9010', now() - interval '18 days');

-- ============================================================================
-- LOYALTY MEMBERS - The Barber Co Premium - VIP Grooming Pass
-- ============================================================================

INSERT INTO loyalty_accounts (campaign_id, client_id, email, name, phone, current_progress, total_visits, reward_unlocked, member_code, enrolled_at) VALUES
  ('c1000000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000003', 'victor.butler@example.com', 'Victor Butler', '0412347021', 10, 12, true, 'FFGH9011', now() - interval '88 days'),
  ('c1000000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000003', 'wayne.simmons@example.com', 'Wayne Simmons', '0412347022', 7, 7, false, 'GGHJ9012', now() - interval '52 days'),
  ('c1000000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000003', 'xavier.foster@example.com', 'Xavier Foster', '0412347023', 4, 4, false, 'HHJK9013', now() - interval '30 days'),
  ('c1000000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000003', 'yves.gonzales@example.com', 'Yves Gonzales', '0412347024', 9, 10, false, 'JJKL9014', now() - interval '65 days'),
  ('c1000000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000003', 'zach.nelson@example.com', 'Zach Nelson', '0412347025', 10, 13, true, 'KKLM9015', now() - interval '80 days'),
  ('c1000000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000003', 'adam.carter@example.com', 'Adam Carter', '0412347026', 2, 2, false, 'LLMN9016', now() - interval '10 days'),
  ('c1000000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000003', 'blake.mitchell@example.com', 'Blake Mitchell', '0412347027', 6, 6, false, 'MMNO9017', now() - interval '45 days'),
  ('c1000000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000003', 'cole.perez@example.com', 'Cole Perez', '0412347028', 5, 5, false, 'NNOP9018', now() - interval '33 days'),
  ('c1000000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000003', 'dean.roberts@example.com', 'Dean Roberts', '0412347029', 8, 9, false, 'OOPQ9019', now() - interval '58 days'),
  ('c1000000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000003', 'evan.turner@example.com', 'Evan Turner', '0412347030', 10, 14, true, 'PPQR9020', now() - interval '86 days');

-- ============================================================================
-- ACTIVITY LOGS
-- ============================================================================

INSERT INTO loyalty_progress_log (loyalty_account_id, campaign_id, action_type, quantity, created_at)
SELECT
  la.id,
  la.campaign_id,
  CASE WHEN la.reward_unlocked THEN 'reward_unlocked' ELSE 'visit_confirmed' END,
  1,
  now() - (floor(random() * 30) || ' days')::interval
FROM loyalty_accounts la
LIMIT 200;

-- ============================================================================
-- LEADS
-- ============================================================================

INSERT INTO leads (campaign_id, client_id, brand_id, data, created_at)
SELECT
  c.id,
  c.client_id,
  c.brand_id,
  jsonb_build_object(
    'name', nm.name,
    'email', lower(replace(nm.name, ' ', '.')) || floor(random() * 100)::text || '@leadtest.com',
    'phone', '04' || (floor(random() * 90000000) + 10000000)::text
  ),
  now() - (floor(random() * 60) || ' days')::interval
FROM campaigns c
CROSS JOIN (
  VALUES ('Alex Turner'), ('Maria Rossi'), ('Jake Chen'), ('Sarah Blake'), ('Tom Ford'), ('Nina Patel')
) AS nm(name)
WHERE c.status = 'active';
