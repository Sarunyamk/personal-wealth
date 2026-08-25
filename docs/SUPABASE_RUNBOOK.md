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

Use two separate browser profiles or an incognito window.

1. User A creates an asset, liability, transaction and goal.
2. User B signs in and confirms none of User A's records appear.
3. Attempt direct selects and updates using User A record IDs with User B's Supabase session.
4. Confirm every request returns no rows or an RLS error.
5. Record the result in `PLAN.md` before completing Phase A.

## 5. Account lifecycle test

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

## 6. Hosted session settings

In Supabase Authentication settings:

- JWT expiry: approximately 3600 seconds
- Time-boxed sessions: 7 days
- Refresh-token rotation: enabled

Re-test login, refresh, logout, disabled accounts and expired sessions after changing these values.
