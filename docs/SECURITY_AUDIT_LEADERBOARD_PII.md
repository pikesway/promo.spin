# Security Audit: Public Leaderboard PII Exposure Fix

**Date**: 2026-04-08
**Severity**: CRITICAL
**Status**: RESOLVED

## Executive Summary

A critical security vulnerability was identified and remediated in the public leaderboard feature. The vulnerability allowed anonymous (unauthenticated) users to access sensitive personally identifiable information (PII) from the `leads` table, including email addresses and phone numbers.

## Vulnerability Details

### The Problem

Two RLS policies on the `leads` table inadvertently exposed ALL columns to anonymous users:

1. **Policy**: "Public can view lead names for leaderboards" (migration 20260408105602)
   - Granted: `SELECT` on `leads` table to `anon` role
   - Impact: `anon` could execute `SELECT * FROM leads` exposing all PII

2. **Policy**: "Anyone can view leads" (pre-existing)
   - Granted: `SELECT` on `leads` table to `public` role
   - Impact: Any user could access all lead data including sensitive PII

### Why RLS Policies Don't Provide Column-Level Security

RLS (Row-Level Security) policies control which ROWS a user can access, NOT which COLUMNS. A policy like:

```sql
CREATE POLICY "Public can view leads"
  ON leads FOR SELECT TO anon
  USING (true);
```

Allows anonymous users to execute:
```sql
SELECT id, name, email, phone, address, ... FROM leads;
```

This exposes ALL columns, not just the ones needed for leaderboards.

### Exposed Data

The following sensitive PII was accessible to anonymous users:
- Email addresses
- Phone numbers
- Physical addresses (if collected)
- Any other lead metadata

## Solution Implemented

### Architecture: Secure Database View with Column-Level Security

Instead of granting table-level access, we implemented a defense-in-depth approach:

#### 1. Revoked All Anonymous Access to `leads` Table

```sql
-- Drop insecure policies
DROP POLICY "Public can view lead names for leaderboards" ON leads;
DROP POLICY "Anyone can view leads" ON leads;

-- Revoke grants
REVOKE ALL ON leads FROM anon;
```

#### 2. Created Secure View: `public_leaderboard_view`

```sql
CREATE VIEW public_leaderboard_view
WITH (security_invoker = false)  -- SECURITY DEFINER mode
AS
SELECT
  cl.id as leaderboard_id,
  cl.campaign_id,
  cl.lead_id,
  cl.final_score as score,
  cl.time_elapsed_seconds,
  cl.completed_at,
  cl.metadata,
  -- ONLY safe columns from leads (NO email, phone, or other PII)
  l.id as player_id,
  l.name as player_name,
  -- Campaign context for branding
  c.id as campaign_id_ref,
  c.name as campaign_name,
  c.client_id,
  c.brand_id
FROM campaign_leaderboards cl
INNER JOIN leads l ON l.id = cl.lead_id
INNER JOIN campaigns c ON c.id = cl.campaign_id;
```

Key security features:
- **Column Whitelisting**: Explicitly selects ONLY `name` from leads table
- **Security Definer**: View runs with creator's privileges, bypassing RLS
- **No PII Columns**: Email, phone, address are NOT included
- **Read-Only**: Only SELECT is granted to anonymous users

#### 3. Granted Minimal Permissions

```sql
-- Revoke all privileges first
REVOKE ALL ON public_leaderboard_view FROM anon;

-- Grant ONLY SELECT
GRANT SELECT ON public_leaderboard_view TO anon;
```

#### 4. Updated Frontend Code

Changed `PublicLeaderboard.jsx` to use the secure view:

```javascript
// Before (INSECURE):
.from('campaign_leaderboards')
.select('*, leads(name, email)')

// After (SECURE):
.from('public_leaderboard_view')
.select('*')
```

## Security Posture After Fix

### Anonymous (anon) Role Permissions

| Resource | Permission | Access Level |
|----------|-----------|--------------|
| `leads` table | SELECT | ❌ DENIED (no policy) |
| `leads` table | INSERT | ✅ ALLOWED (for lead capture) |
| `public_leaderboard_view` | SELECT | ✅ ALLOWED (name only) |
| `public_leaderboard_view` | INSERT/UPDATE/DELETE | ❌ DENIED |

### Authenticated Users

| Resource | Permission | Access Level |
|----------|-----------|--------------|
| `leads` table | SELECT | ✅ ALLOWED (scoped to their client) |
| `leads` table | INSERT | ✅ ALLOWED |
| `public_leaderboard_view` | SELECT | ✅ ALLOWED |

### Admin Users

| Resource | Permission | Access Level |
|----------|-----------|--------------|
| `leads` table | ALL | ✅ ALLOWED (full access) |

## Verification & Testing

### Security Tests Performed

1. **Verified anon cannot access leads table**:
   ```sql
   -- As anon role:
   SELECT * FROM leads;
   -- Result: ❌ Permission denied
   ```

2. **Verified view exposes only safe columns**:
   ```sql
   SELECT column_name
   FROM information_schema.columns
   WHERE table_name = 'public_leaderboard_view'
   AND column_name IN ('email', 'phone', 'address');
   -- Result: ✅ 0 rows (no PII columns)
   ```

3. **Verified view works correctly**:
   ```sql
   SELECT player_name, score FROM public_leaderboard_view;
   -- Result: ✅ Returns player names without PII
   ```

4. **Verified anon has read-only access to view**:
   ```sql
   -- Check privileges
   SELECT privilege_type
   FROM information_schema.role_table_grants
   WHERE table_name = 'public_leaderboard_view' AND grantee = 'anon';
   -- Result: ✅ Only SELECT
   ```

## Migrations Applied

1. **20260408120000_fix_leaderboard_pii_exposure.sql**
   - Dropped insecure "Public can view lead names" policy
   - Created `public_leaderboard_view` with column-level security
   - Granted SELECT to anon and authenticated

2. **20260408120100_lock_down_view_permissions.sql**
   - Revoked unnecessary privileges on view
   - Ensured only SELECT is granted

3. **20260408120200_remove_public_leads_access.sql**
   - Dropped pre-existing "Anyone can view leads" policy
   - Added proper authenticated-only policies

## Best Practices Applied

### Defense in Depth
- Multiple layers: table revocation + view + column selection + explicit grants

### Principle of Least Privilege
- anon role gets ONLY what's needed (player names for leaderboards)

### Secure by Default
- All privileges revoked first, then minimal access granted

### Column-Level Security
- Explicit column whitelisting in view prevents accidental PII exposure

### Security Definer Pattern
- View runs with elevated privileges while exposing only safe columns

## Recommendations

### For Future Development

1. **Never use `USING (true)` for SELECT policies** without careful consideration
   - Always ask: "What columns are exposed?"
   - Consider using views instead for public access

2. **Audit all RLS policies regularly**
   ```sql
   SELECT tablename, policyname, roles, cmd
   FROM pg_policies
   WHERE roles::text LIKE '%anon%' OR roles::text LIKE '%public%';
   ```

3. **Use views for public data access**
   - Views provide column-level control
   - Security definer mode bypasses RLS while maintaining security

4. **Test with anon role**
   - Always verify what anonymous users can actually access
   - Don't assume RLS provides column-level security

5. **Document security decisions**
   - Explain why policies exist
   - Note what data is exposed and why

## Lessons Learned

1. **RLS is row-level, not column-level**: Need views for column control
2. **Policy comments can be misleading**: "name only" in comment doesn't restrict columns
3. **Multiple policies can overlap**: Both policies exposed the same data
4. **Security requires layers**: Single approach (RLS alone) is insufficient
5. **Test security assumptions**: Verify what's actually accessible, not what should be

## Conclusion

The public leaderboard PII exposure has been completely remediated through a comprehensive security approach combining table access revocation, secure database views with column whitelisting, and minimal privilege grants. The system now provides public leaderboard access without exposing any sensitive user information.

All changes have been tested and verified. The frontend has been updated to use the secure view, and the application builds successfully.

---

**Reviewed by**: Principal Security Architect
**Classification**: Internal Security Documentation
**Next Review**: Before any future public-facing feature releases