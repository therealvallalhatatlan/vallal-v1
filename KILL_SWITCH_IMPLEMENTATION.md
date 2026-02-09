# Kill Switch / Proof-of-Control System

## Overview

A tamper-resistant emergency control system that allows a single trusted admin to instantly disable write operations across the entire application. The system operates in two modes: **SAFE** (normal operation) and **READ_ONLY** (emergency lockdown).

## Architecture

### Database Layer
**Tables:**
- `system_control` - Single-row table storing current mode (enforced by constraint)
- `system_control_history` - Tamper-proof audit log of all mode changes

**Security:**
- Row Level Security (RLS) enabled
- Public read access (required for middleware performance)
- Updates restricted to service role only
- Automatic audit logging via database trigger

### Enforcement Layers

1. **Edge Middleware** (Primary enforcement)
   - Intercepts all HTTP requests before they reach application code
   - Blocks non-admin write operations (POST/PUT/PATCH/DELETE) in READ_ONLY mode
   - 30-second in-memory cache for performance
   - Returns 503 status with clear error messages

2. **API Route Guards** (Defense in depth)
   - Additional checks in critical write endpoints
   - Protects against middleware bypass attempts
   - Graceful error handling

3. **Global UI Banner** (Transparency)
   - Always-visible status indicator on all pages
   - Green "Operator in control" (SAFE mode)
   - Amber "Read-only safety mode enabled" (READ_ONLY mode)
   - Auto-refreshes every 30 seconds

## Files Modified/Created

### Database
- `db/migrations/007_create_system_control.sql` - Schema and RLS policies

### Core Infrastructure
- `middleware.ts` - Edge middleware with mode checking and caching
- `lib/systemGuard.ts` - Utility functions for mode checking
- `lib/actions.ts` - Server actions for toggling mode and fetching history

### UI Components
- `components/StatusBanner.tsx` - Global status banner component
- `app/layout.tsx` - Integrated banner into root layout
- `app/admin/page.tsx` - Admin control panel with toggle UI

### Protected API Routes
Write operations guarded in:
- `app/api/feed/route.ts` - POST, PATCH, DELETE (community posts)
- `app/api/comments/route.ts` - POST (story comments)
- `app/api/checkout/route.ts` - POST (payment initiation)
- `app/api/inbox/route.ts` - POST (create conversation)
- `app/api/inbox/messages/route.ts` - POST (send message)
- `app/api/gift/[id]/route.ts` - POST (gift redemption)

### New Endpoints
- `app/api/system/status/route.ts` - Public status check (cached 30s)

## Usage

### Admin Access
1. Navigate to `/admin`
2. Enter admin key (validates against `DEMO_ADMIN_KEY` env var)
3. View "Kill Switch Control" section at top of admin panel

### Activating READ_ONLY Mode
1. Click "Activate Read-Only" button
2. Confirm in dialog
3. Mode changes instantly; propagates within 30 seconds globally

**Effects:**
- All non-admin write operations return 503 error
- Login/authentication disabled for users
- API routes return descriptive error messages
- Banner shows amber warning on all pages
- Admins can still perform writes (bypass enforcement)

### Restoring SAFE Mode
1. Click "Deactivate Read-Only" button
2. Confirm in dialog
3. Normal operations resume within 30 seconds

### Audit Trail
- All mode changes logged automatically in `system_control_history`
- Visible in admin panel (last 10 changes)
- Includes: timestamp, mode, changed_by email, previous mode

## Security Model

### Trust Assumptions
- Single trusted operator identified by email in `ADMIN_EMAILS` env var
- No multi-sig or external verification required
- Admin has full control; system trusts admin completely

### Protection Mechanisms
1. **Tamper Resistance**
   - Database trigger auto-logs all changes (cannot be bypassed)
   - RLS policies prevent unauthorized database writes
   - Service role required for updates (server-side only)

2. **Cache Invalidation**
   - 30-second TTL on cached mode
   - Worst-case propagation delay: 30 seconds
   - Acceptable for emergency use case

3. **Defense in Depth**
   - Middleware blocks at edge
   - API guards provide secondary protection
   - Banner ensures transparency

### Known Limitations

1. **Accidental Lockout Risk**
   - Admin bypass is built-in (admins can always write)
   - Admin still sees banner (confirmation mode is active)
   - If admin loses session, must re-authenticate

2. **Stale Cache on Deploy**
   - Middleware cache resets on function cold start
   - New deployments will re-fetch mode within 30s
   - No persistent cache across deployments

3. **Time Window**
   - 30-second propagation delay between mode toggle and full enforcement
   - Trade-off: performance vs. instant enforcement
   - To reduce: lower `CACHE_TTL` in middleware.ts (line 8)

4. **Serverless Limitations**
   - In-memory cache per function instance
   - Different edge regions may have slight lag
   - Rate limiting resets on function restart

## Configuration

### Environment Variables
```bash
# Required for admin access
ADMIN_EMAILS="admin@example.com,operator@example.com"

# Required for database access
SUPABASE_URL="https://xxx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJxxx..."

# Required for admin panel access
DEMO_ADMIN_KEY="your-secret-key"
```

### Performance Tuning
**Cache Duration** (middleware.ts, line 8):
```typescript
const CACHE_TTL = 30000; // 30 seconds
```
- Decrease for faster propagation (higher DB load)
- Increase for better performance (slower propagation)

**Banner Refresh Rate** (StatusBanner.tsx, line 20):
```typescript
const interval = setInterval(fetchSystemMode, 30000);
```
- Adjust to match cache TTL for consistency

## Deployment Checklist

1. **Run Database Migration**
   ```bash
   # Apply migration to Supabase
   psql $DATABASE_URL < db/migrations/007_create_system_control.sql
   ```

2. **Set Environment Variables**
   - Ensure `ADMIN_EMAILS` is set in Vercel/production
   - Verify Supabase credentials are correct

3. **Verify RLS Policies**
   - Test that non-admins can read but not write `system_control`
   - Confirm service role has full access

4. **Test Mode Toggle**
   - Toggle to READ_ONLY and verify writes are blocked
   - Check banner appears correctly
   - Verify admin can still write
   - Toggle back to SAFE and verify normal operation

5. **Monitor Audit Log**
   - Check `system_control_history` table for entries
   - Verify timestamps and email attribution

## Optional Hardening Steps

### 1. Instant Propagation (Vercel Edge Config)
Replace middleware cache with Vercel Edge Config for sub-second reads:
```typescript
import { get } from '@vercel/edge-config';
const mode = await get('system_mode');
```

### 2. External Monitoring
Add webhook notification on mode toggle:
```typescript
// In toggleSystemMode server action
await fetch('https://monitoring.example.com/webhook', {
  method: 'POST',
  body: JSON.stringify({ mode: newMode, email: user.email })
});
```

### 3. Rate Limiting on Toggle
Prevent rapid mode switching (admin protection):
```typescript
// Check last change time from history
const lastChange = await getLastHistoryEntry();
if (Date.now() - new Date(lastChange.changed_at).getTime() < 60000) {
  return { success: false, error: 'Too soon - wait 1 minute' };
}
```

### 4. Server Action Protection
Add mode checks to all server actions (not just API routes):
```typescript
// In any server action
import { checkWriteAllowed } from '@/lib/systemGuard';
const check = await checkWriteAllowed(user.email);
if (!check.allowed) {
  return { error: check.error };
}
```

### 5. Client-Side Auth Flow Disable
Block login UI entirely in READ_ONLY mode (currently only API-level):
```typescript
// In auth pages
const status = await fetch('/api/system/status').then(r => r.json());
if (status.mode === 'READ_ONLY') {
  return <div>Authentication temporarily disabled</div>;
}
```

## Troubleshooting

### Banner Not Appearing
- Check browser console for fetch errors
- Verify `/api/system/status` returns valid JSON
- Ensure StatusBanner is mounted in layout.tsx

### Mode Toggle Not Working
- Verify admin email matches `ADMIN_EMAILS` exactly
- Check server logs for toggleSystemMode errors
- Confirm Supabase service role has update permissions

### Writes Still Going Through in READ_ONLY
- Wait 30 seconds for cache to expire
- Check middleware.ts is deployed
- Verify API route has guardWriteOperation import
- Confirm user is not in ADMIN_EMAILS list

### History Not Recording
- Check database trigger exists: `system_control_audit_trigger`
- Verify service role permissions on history table
- Look for trigger errors in Supabase logs

## Future Enhancements

1. **Granular Modes** - Add modes like READ_ONLY_EXCEPT_PURCHASES
2. **Scheduled Lockdown** - Auto-activate READ_ONLY at specific times
3. **API Key Override** - Allow specific API keys to bypass READ_ONLY
4. **Webhook on Toggle** - Notify external systems of mode changes
5. **Metrics Dashboard** - Track mode uptime and toggle frequency
6. **Multi-Admin Approval** - Require 2+ admins to toggle (if trust model changes)
