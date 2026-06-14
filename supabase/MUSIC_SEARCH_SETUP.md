# Music Search — "What's powering your lift?" Setup

This feature lets users search for songs, pick a track, and share it with friends for 24 hours. Search runs through a Supabase Edge Function that proxies the free [iTunes Search API](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/) — no API keys or subscriptions required.

Complete these steps **in order**.

---

## Step 1: Run the database migrations

If you have not already set up the database, run all migration files in order per [SETUP.md](SETUP.md). The now-playing tables and RPCs live in:

- `001_schema.sql` — `user_now_playing`, `now_playing_reactions`
- `004_functions.sql` — `set_now_playing`, `clear_now_playing`, `get_my_now_playing`, reaction RPCs, and `get_friend_summary` (includes friends' active songs)

---

## Step 2: Install the Supabase CLI (one-time)

Pick one method:

**Windows (Scoop):**
```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**npm (any OS):**
```bash
npm install -g supabase
```

**Or** follow the official guide: [supabase.com/docs/guides/cli](https://supabase.com/docs/guides/cli)

Verify:
```bash
supabase --version
```

---

## Step 3: Log in and link your project

1. Log in:
   ```bash
   supabase login
   ```
   This opens a browser to authenticate.

2. Find your **Project ref** in Supabase → **Project Settings → General** (e.g. `abcdefghijklmnop`).

3. From your repo root, link the project:
   ```bash
   cd path/to/lift.github.io
   supabase link --project-ref YOUR_PROJECT_REF
   ```
   Enter your database password when prompted.

---

## Step 4: Deploy the Edge Function

From the repo root:

```bash
supabase functions deploy music-search
```

You should see output ending with a deployed function URL like:
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/music-search
```

The app calls this via `supabase.functions.invoke('music-search', …)` — no frontend env changes or secrets needed.

---

## Step 5: Test locally (optional)

1. Ensure `.env` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (see [SETUP.md](SETUP.md)).
2. Run the app:
   ```bash
   npm run dev
   ```
3. Log in → **Profile** → **What's powering your lift?**
4. Search for a song, pick one, confirm it shows with hours remaining.
5. Have a friend accept a friend request and confirm the song appears next to your username on their friends list.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| "Search failed" / non-2xx | Function not deployed | Run `supabase functions deploy music-search` |
| 401 Unauthorized on search | Not logged in | User must be authenticated |
| Empty search results | Query too short (< 2 chars) or no matches | Type at least 2 characters |
| Function deploy fails | CLI not linked | Re-run `supabase link --project-ref …` |

---

## Updating the function later

After editing `supabase/functions/music-search/index.ts`:

```bash
supabase functions deploy music-search
```

No app redeploy is required unless you also changed frontend code.

---

## Storage note

Only song metadata and album-art URLs are stored (~1 KB per user). Images are loaded from Apple's CDN, not Supabase Storage.

## Rate limits

The iTunes Search API allows roughly 20 requests per minute. The app debounces search input (300 ms) and limits results to 8 per query, which is sufficient for normal use. The edge function proxy keeps requests server-side.
