/*
  # Phase 3: Backfill loyalty_accounts.lead_id

  ## Summary
  For every loyalty_accounts row, find or create a matching leads row scoped
  to the same brand_id, then set loyalty_accounts.lead_id.

  ## Matching priority
  1. Match by normalized email within brand_id (WHERE email IS NOT NULL)
  2. Fallback: match by normalized phone within brand_id (WHERE phone IS NOT NULL)
  3. No match: create a new leads row from the loyalty account's PII fields

  ## Data moved
  - name, email, phone from loyalty_accounts → leads
  - birthday from loyalty_accounts → leads
  - source_type is set to 'loyalty' for newly created lead rows

  ## Notes
  - This is a PL/pgSQL DO block for row-by-row processing
  - Only processes rows where lead_id IS NULL (idempotent)
  - Does not remove any columns yet
*/

DO $$
DECLARE
  acct RECORD;
  matched_lead_id uuid;
  new_lead_id uuid;
  normalized_email text;
  normalized_phone text;
BEGIN
  FOR acct IN
    SELECT id, campaign_id, client_id, brand_id, name, email, phone, birthday
    FROM loyalty_accounts
    WHERE lead_id IS NULL
  LOOP
    matched_lead_id := NULL;
    normalized_email := NULLIF(TRIM(LOWER(acct.email)), '');
    normalized_phone := NULLIF(TRIM(acct.phone), '');

    -- Match 1: by normalized email within brand
    IF normalized_email IS NOT NULL AND acct.brand_id IS NOT NULL THEN
      SELECT id INTO matched_lead_id
      FROM leads
      WHERE brand_id = acct.brand_id
        AND lower(email) = normalized_email
      LIMIT 1;
    END IF;

    -- Match 2: by normalized phone within brand (no email match)
    IF matched_lead_id IS NULL AND normalized_phone IS NOT NULL AND acct.brand_id IS NOT NULL THEN
      SELECT id INTO matched_lead_id
      FROM leads
      WHERE brand_id = acct.brand_id
        AND lower(phone) = lower(normalized_phone)
      LIMIT 1;
    END IF;

    -- Match 3: create a new lead row
    IF matched_lead_id IS NULL THEN
      INSERT INTO leads (
        client_id,
        brand_id,
        name,
        email,
        phone,
        birthday,
        source_type,
        created_at,
        updated_at
      ) VALUES (
        acct.client_id,
        acct.brand_id,
        COALESCE(NULLIF(TRIM(acct.name), ''), 'Unknown'),
        normalized_email,
        normalized_phone,
        acct.birthday,
        'loyalty',
        now(),
        now()
      )
      RETURNING id INTO new_lead_id;

      matched_lead_id := new_lead_id;
    ELSE
      -- If we matched an existing lead and it lacks birthday, backfill it
      IF acct.birthday IS NOT NULL THEN
        UPDATE leads
        SET birthday = acct.birthday
        WHERE id = matched_lead_id AND birthday IS NULL;
      END IF;
    END IF;

    -- Set lead_id on the loyalty account
    UPDATE loyalty_accounts
    SET lead_id = matched_lead_id
    WHERE id = acct.id;

  END LOOP;
END $$;
