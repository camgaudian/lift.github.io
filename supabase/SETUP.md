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
| Site URL | `https://lift.github.io` |
| Redirect URLs | `http://localhost:5173/**` |
| | `https://lift.github.io/**` |

## 4. Run database migrations

1. Open **SQL Editor** in the Supabase dashboard.
2. Run each file in order from [`supabase/migrations/`](migrations/):
   - `001_schema.sql`
   - `002_rls.sql`
   - `003_seed_exercises.sql`
   - `004_stats_functions.sql`

Alternatively, if you install the [Supabase CLI](https://supabase.com/docs/guides/cli), run:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

## 5. Copy API credentials

Open **Project Settings → API** and copy:

- **Project URL** → `VITE_SUPABASE_URL`
- **anon public** key → `VITE_SUPABASE_ANON_KEY`

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

For GitHub Pages deployment, add the same values as repository secrets:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 6. Verify

1. Run `npm install && npm run dev`.
2. Sign up with your email.
3. Confirm your email if verification is enabled.
4. Log in and start a workout.

## Security note

The anon key is safe to embed in the client. All user data is protected by Row Level Security (RLS) policies in the migrations.
