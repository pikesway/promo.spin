/*
  # Phase 2: Backfill leads real columns from data jsonb blob

  ## Summary
  Populates the new name/email/phone columns on existing leads rows
  from the legacy data jsonb blob. Sets source_type = 'game' for all
  existing rows (they were all game-play captures).

  ## Changes
  - Backfill leads.name from data->>'name'
  - Backfill leads.email from data->>'email'
  - Backfill leads.phone from data->>'phone'
  - Set leads.source_type = 'game' for all existing rows
  - Set leads.updated_at = created_at for all existing rows (no update history)

  ## Notes
  - data jsonb column is NOT dropped here — that happens in Phase 6
  - This is a data migration only; no structural changes
*/

UPDATE leads
SET
  name = COALESCE(data->>'name', ''),
  email = NULLIF(TRIM(LOWER(data->>'email')), ''),
  phone = NULLIF(TRIM(data->>'phone'), ''),
  source_type = 'game',
  updated_at = created_at
WHERE name IS NULL;
