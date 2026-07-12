# Lift

A mobile-first PWA workout tracker. Log strength, bodyweight, and cardio sessions with templates, per-exercise notes, and stats-heavy dashboards.

Live at [lift.gaudian.dev](https://lift.gaudian.dev).

## Features

- Email auth with sync across devices (Supabase)
- ~50 built-in exercises + custom exercises
- Workout templates
- Live session logging and post-workout logging
- Last session weights/reps placeholders and carry-forward notes
- History calendar
- Dashboard and Stats: cumulative volume, weekly charts, PR leaderboard, streaks, fun aggregates
- Install on iPhone: open in **Safari** → Share → **Add to Home Screen**

## Quick start

### 1. Supabase

Follow [supabase/SETUP.md](supabase/SETUP.md) to create a project, run migrations, and get API keys.

### 2. Local development

```bash
cp .env.example .env
# Edit .env with your Supabase URL and anon key

npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### 3. Deploy to GitHub Pages

1. In your repo **Settings → Pages**, set source to **GitHub Actions**.
2. Set custom domain to `lift.gaudian.dev` (requires a CNAME record pointing to `YOUR_USERNAME.github.io`).
3. Add repository secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_VAPID_PUBLIC_KEY` (see `supabase/SETUP.md` §6b for Web Push)
4. Push to `main`. The workflow in `.github/workflows/deploy.yml` builds and deploys.

## Tech stack

- React 19 + Vite + TypeScript
- Tailwind CSS 4
- Supabase (Auth, Postgres, RLS)
- Recharts
- vite-plugin-pwa

## Project structure

```
src/features/   # auth, workouts, exercises, templates, history, stats, dashboard
supabase/       # migrations, seed data, setup guide
```

## iOS install tip

Chrome on iOS cannot add PWAs to the home screen. Use Safari, then Share → Add to Home Screen.
