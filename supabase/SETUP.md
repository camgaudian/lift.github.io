# Supabase Setup for Lift

Follow these steps before running the app locally or deploying.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New project** (free tier is sufficient).
3. Choose a name, database password, and region. Wait for the project to finish provisioning.

## 2. Enable email auth

1. Open **Authentication → Providers → Email**.
2. Enable **Email** provider.
3. (Recommended) Enable **Confirm email** for new sign-ups.

## 3. Configure redirect URLs

Open **Authentication → URL configuration** and set:

| Setting | Value |
|---------|-------|
| Site URL | `https://lift.gaudian.dev` |
| Redirect URLs | `http://localhost:5173/**` |
| | `https://lift.gaudian.dev/**` |

The app passes `emailRedirectTo` on sign-up and resend, so confirmation links land on `/login`.

## 4. Configure email delivery (recommended for production)

Supabase's built-in email service is rate-limited (~2–4 emails/hour) and is intended for testing only. For real sign-ups, connect a custom SMTP provider.

### Resend (recommended)

1. Create an account at [resend.com](https://resend.com).
2. Add and verify a sending subdomain (e.g. `auth.gaudian.dev`) by adding the DNS records Resend provides to your domain registrar.
3. Create an API key with sending access.
4. In Supabase → **Authentication → Email → SMTP Settings**, enable custom SMTP:

   | Field | Value |
   |-------|-------|
   | Sender email | `noreply@auth.gaudian.dev` |
   | Sender name | `Lift` |
   | Host | `smtp.resend.com` |
   | Port | `465` |
   | Username | `resend` |
   | Password | your Resend API key |

   Alternatively, use Resend's [Supabase integration](https://resend.com/docs/knowledge-base/getting-started-with-resend-and-supabase) to configure this automatically.

5. In **Authentication → Rate Limits**, raise **Rate limit for sending emails** (e.g. 30–100/hour).

Resend free tier: 3,000 emails/month, 100/day. See [resend.com/pricing](https://resend.com/pricing).

## 5. Run database migrations

These files describe the full current schema. Run them in order on a **new** project:

1. Open **SQL Editor** in the Supabase dashboard.
2. Run each file from [`supabase/migrations/`](migrations/):
   - `001_schema.sql` — tables, types, indexes, triggers
   - `002_rls.sql` — row-level security policies
   - `003_seed_exercises.sql` — built-in exercise library (50 exercises)
   - `004_functions.sql` — RPCs and helper functions
   - `005_avatars.sql` — profile avatars
   - `006_updates_popup.sql` — updates popup flag (legacy boolean; kept for old clients)
   - `008_seed_more_exercises.sql` — additional built-in exercises (82)
   - `009_hide_exercise_data_from_friends.sql` — PR sharing privacy preference
   - `010_push_notifications.sql` — Web Push subscriptions, prefs, triggers, workout-reminder cron
   - `011_updates_popup_version.sql` — versioned updates popup (`last_seen_updates_version`)

For Spotify now-playing, also complete [SPOTIFY_SETUP.md](SPOTIFY_SETUP.md) (Edge Function deploy; schema is already in the files above).

For Web Push (device notifications), also complete **section 6b** below after running `010_push_notifications.sql`.

For incremental changes on an existing database, add a new numbered migration (e.g. `005_…sql`) rather than editing these reference files.

Alternatively, if you install the [Supabase CLI](https://supabase.com/docs/guides/cli), run:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

## 6. Copy API credentials

Open **Project Settings → API** and copy:

- **Project URL** → `VITE_SUPABASE_URL`
- **anon public** key → `VITE_SUPABASE_ANON_KEY`

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Web Push (public VAPID key only — never put the private key in the client)
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key

# Local dev only — proxied by Vite for in-app feedback (never bundled)
DISCORD_FEEDBACK_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
```

For production feedback (Settings → Send feedback), deploy the `send-feedback` edge function and set the webhook as a Supabase secret (not in the client):

```bash
supabase secrets set DISCORD_FEEDBACK_WEBHOOK_URL="https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN"
supabase functions deploy send-feedback
```

For GitHub Pages deployment, add the same values as repository secrets:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_VAPID_PUBLIC_KEY`

## 6b. Web Push notifications

Push alerts cover friend requests, exercise/template shares, song reactions, and a one-time reminder when an active workout is older than 5 hours. Users customize types under **Settings → Push notifications**.

### Enable extensions

In the Supabase dashboard → **Database → Extensions**, enable:

- `pg_net` (HTTP from the database to the Edge Function)
- `pg_cron` (schedules the 5-hour workout reminder check)

Then re-run the cron scheduling block from `010_push_notifications.sql` if the job was not created (look for job name `lift-workout-reminders` under **Database → Cron Jobs**).

### Generate VAPID keys

```bash
npx web-push generate-vapid-keys
```

Put the **public** key in `.env` as `VITE_VAPID_PUBLIC_KEY` (and in GitHub Actions secrets). Keep the **private** key only in Supabase secrets.

### Deploy `dispatch-push`

```bash
# Generate a long random secret for DB → function auth, e.g.:
# openssl rand -hex 32

supabase secrets set \
  VAPID_PUBLIC_KEY="your-vapid-public-key" \
  VAPID_PRIVATE_KEY="your-vapid-private-key" \
  VAPID_SUBJECT="mailto:noreply@your-domain.com" \
  PUSH_DISPATCH_SECRET="your-long-random-secret" \
  APP_ORIGIN="https://lift.gaudian.dev"

# JWT verify must stay off — Postgres calls this with x-push-secret, not a user JWT.
# config.toml sets [functions.dispatch-push] verify_jwt = false; pass the flag explicitly too:
supabase functions deploy dispatch-push --no-verify-jwt
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically to Edge Functions.

If friend-request / share pushes never arrive, check Edge Function logs for
`UNAUTHORIZED_NO_AUTH_HEADER` — that means the function was deployed with JWT
verification still enabled. Redeploy with `--no-verify-jwt`.

### Point the database at the function

In **SQL Editor**, set the runtime config (replace placeholders):

```sql
UPDATE public.push_runtime_config
SET
  edge_function_url = 'https://YOUR_PROJECT.supabase.co/functions/v1/dispatch-push',
  dispatch_secret = 'your-long-random-secret',
  app_origin = 'https://lift.gaudian.dev'
WHERE singleton = true;
```

`dispatch_secret` must match `PUSH_DISPATCH_SECRET`.

### Notes

- **Android / desktop:** works in Chromium and Firefox after the user grants permission.
- **iOS:** Web Push requires **Safari → Add to Home Screen** (iOS 16.4+). In-tab Safari and Chrome on iOS cannot receive push.
- Until `push_runtime_config` is filled in, triggers and the cron job no-op (no errors for users).

## 7. Verify

1. Run `npm install && npm run dev`.
2. Sign up with your email.
3. Confirm your email if verification is enabled.
4. Log in and start a workout.

## Security note

The anon key is safe to embed in the client. All user data is protected by Row Level Security (RLS) policies in the migrations.
