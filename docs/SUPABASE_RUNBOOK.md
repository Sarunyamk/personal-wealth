# Supabase Operations Runbook

Use this runbook for the hosted project before marking Phase A or B complete.

## 1. Apply migrations

Preferred CLI flow:

```powershell
pnpm dlx supabase login
pnpm dlx supabase link --project-ref azjopogiuehnhdhfvhml
pnpm dlx supabase db push
```

If CLI access is unavailable, run unapplied files from `supabase/migrations/` in filename order in
the Supabase SQL Editor. Do not rerun a partially applied migration without checking which objects
already exist.

Verify the latest Admin RPC:

```sql
select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('is_active_user', 'admin_list_users');
```

## 2. Deploy the Admin Edge Function

```powershell
pnpm dlx supabase functions deploy admin-users --project-ref azjopogiuehnhdhfvhml
```

The function reads hosted project keys from Supabase-managed Edge Function secrets. Never add a
secret or service-role key to frontend environment variables or GitHub Actions.

## 3. Verify account roles

Run in SQL Editor with the real admin email:

```sql
select u.id, u.email, p.display_name, p.role, p.status, p.disabled_at
from auth.users u
join public.profiles p on p.id = u.id
order by u.created_at;
```

Only intended administrators may have `role = 'admin'`. Normal accounts must remain `user`.

## 4. Two-user isolation test

Run the automated local test after `supabase start` and `supabase db reset`:

```powershell
npm run test:rls
```

Then repeat the user-facing flow on hosted Supabase before release:

Use two separate browser profiles or an incognito window.

1. User A creates an asset, liability, transaction and goal.
2. User B signs in and confirms none of User A's records appear.
3. Attempt direct selects and updates using User A record IDs with User B's Supabase session.
4. Confirm every request returns no rows or an RLS error.
5. Record the result in `PLAN.md` before completing Phase A.

## 5. Account lifecycle test

Run the automated local Edge Function test first:

```powershell
npm run test:lifecycle
```

Then verify the visible notification/logout behavior in two hosted browser sessions:

1. Admin disables User B from the Admin page.
2. Confirm User B receives a disabled-account notice and is signed out within 30 seconds or when
   returning to the browser tab.
3. Confirm User B cannot sign in again.
4. Enable User B and confirm sign-in works again.
5. Create disposable data for User B, delete the account, and confirm related rows are removed from
   every user-owned table through foreign-key cascade.

Profile status blocks database access immediately through restrictive RLS. The Edge Function also
bans the Auth account. Administrative lifecycle changes should use the Admin UI rather than manual
profile edits so both layers remain synchronized.

Migration `202608250006_sync_auth_ban_status.sql` keeps `auth.users.banned_until` and
`profiles.status` synchronized with a database trigger. This also covers ban/unban changes made in
the Supabase Authentication dashboard. The Admin Edge Function verifies the synchronized profile
status before returning success.

## 6. Profile preferences

Migration `202608250004_profile_preferences.sql` adds `privacy_default` and grants authenticated
users column-level update access only to `display_name`, `base_currency`, `theme`, and
`privacy_default`. Role, status, and disabled state remain admin-controlled.

After `supabase start` and `supabase db reset`, verify profile persistence and protected columns:

```powershell
npm run test:settings
```

The smoke test creates an authenticated disposable user, saves all editable preferences, reads
them back through RLS, verifies that role/status cannot be changed, and removes the user.

The UI treats Supabase as authoritative: Settings fetches the profile whenever the page opens and
again after saving. Financial and admin mutations complete first, then the current view queries its
repository again before showing success. Asset currency comes from the persisted profile setting.
Browser Supabase requests time out after 15 seconds so failed networks release the blocking loader
and expose a retryable error instead of waiting for the browser's multi-minute network timeout.

Changing a password calls Supabase global sign-out after the update. Existing access tokens on
other devices can remain valid until JWT expiry; the session-security phase verifies the hosted
JWT and session limits.

## 7. Hosted session settings

The local config sets JWT expiry to 3600 seconds, enables refresh-token rotation with the default
10-second reuse interval, and uses a 168-hour time-box. Run the database-backed test with:

```powershell
npm run test:session
```

The hosted Free plan does not provide native time-boxed sessions. Migration
`202608250005_session_access_control.sql` therefore checks the JWT `session_id` against
`auth.sessions` inside the restrictive RLS gate. Sessions older than seven days and revoked
sessions immediately lose access to all user-owned data.

In the hosted Supabase Authentication settings, verify:

- JWT expiry: approximately 3600 seconds
- Refresh-token rotation: enabled
- Refresh-token reuse interval: 10 seconds

Use two browser profiles to re-test login, refresh, global logout, disabled accounts, and expired
sessions after changing these values. Native seven-day time-boxing can replace the RLS fallback if
the project is upgraded to Pro.
