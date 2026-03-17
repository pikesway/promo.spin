/*
  # Deduplicate leads before adding partial unique indexes

  ## Summary
  Some leads rows share the same (brand_id, lower(email)) combination because
  the same person played multiple game campaigns and was inserted as a separate
  lead each time. This migration merges duplicates by:
  1. Keeping the oldest row (earliest created_at) as the canonical lead
  2. Reassigning redemptions.lead_id from the newer duplicate to the kept row
  3. Deleting the duplicate rows

  Also deduplicates on phone if needed.

  ## Notes
  - Only processes rows where brand_id IS NOT NULL
  - Redemptions FK is ON DELETE SET NULL so reassignment is safe before delete
*/

DO $$
DECLARE
  dup RECORD;
  keep_id uuid;
  remove_ids uuid[];
BEGIN
  -- Deduplicate by email within brand
  FOR dup IN
    SELECT brand_id, lower(email) AS norm_email
    FROM leads
    WHERE email IS NOT NULL AND brand_id IS NOT NULL
    GROUP BY brand_id, lower(email)
    HAVING COUNT(*) > 1
  LOOP
    -- Find the oldest (canonical) lead to keep
    SELECT id INTO keep_id
    FROM leads
    WHERE brand_id = dup.brand_id AND lower(email) = dup.norm_email
    ORDER BY created_at ASC
    LIMIT 1;

    -- Get IDs to remove (all but the kept one)
    SELECT ARRAY(
      SELECT id FROM leads
      WHERE brand_id = dup.brand_id
        AND lower(email) = dup.norm_email
        AND id != keep_id
    ) INTO remove_ids;

    -- Reassign redemptions.lead_id
    UPDATE redemptions
    SET lead_id = keep_id
    WHERE lead_id = ANY(remove_ids);

    -- Delete duplicate leads
    DELETE FROM leads WHERE id = ANY(remove_ids);
  END LOOP;

  -- Deduplicate by phone within brand (after email dedup)
  FOR dup IN
    SELECT brand_id, lower(phone) AS norm_phone
    FROM leads
    WHERE phone IS NOT NULL AND brand_id IS NOT NULL
    GROUP BY brand_id, lower(phone)
    HAVING COUNT(*) > 1
  LOOP
    SELECT id INTO keep_id
    FROM leads
    WHERE brand_id = dup.brand_id AND lower(phone) = dup.norm_phone
    ORDER BY created_at ASC
    LIMIT 1;

    SELECT ARRAY(
      SELECT id FROM leads
      WHERE brand_id = dup.brand_id
        AND lower(phone) = dup.norm_phone
        AND id != keep_id
    ) INTO remove_ids;

    UPDATE redemptions
    SET lead_id = keep_id
    WHERE lead_id = ANY(remove_ids);

    DELETE FROM leads WHERE id = ANY(remove_ids);
  END LOOP;
END $$;
