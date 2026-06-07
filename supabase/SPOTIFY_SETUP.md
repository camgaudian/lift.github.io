# Spotify "What's powering your lift?" Setup

This feature lets users search Spotify, pick a track, and share it with friends for 24 hours. Search runs through a Supabase Edge Function so your Spotify Client Secret stays server-side.

Complete these steps **in order**.

---

## Step 1: Run the database migration

1. Open your Supabase project → **SQL Editor**.
2. Paste and run the full contents of [`migrations/013_user_now_playing.sql`](migrations/013_user_now_playing.sql).
3. Confirm success (no errors in the output panel).

This creates the `user_now_playing` table, RPCs (`set_now_playing`, `clear_now_playing`, `get_my_now_playing`), and extends `get_friend_summary` to include friends' active songs.

---

## Step 2: Create a Spotify Developer app

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) and log in with a Spotify account (free account is fine).
2. Click **Create app**.
3. Fill in:
   - **App name**: e.g. `Lift Workout App`
   - **App description**: e.g. `Lets users share a gym anthem with friends`
   - **Redirect URI**: `https://example.com/callback` (required by the form; not used for search-only Client Credentials flow — you can use any valid HTTPS URL)
4. Accept the terms and click **Save**.
5. Open your new app → **Settings** (gear icon).
6. Copy and save:
   - **Client ID**
   - **Client Secret** (click **View client secret**)

Keep the Client Secret private. Never put it in the frontend or commit it to git.

---

## Step 3: Install the Supabase CLI (one-time)

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

## Step 4: Log in and link your project

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

## Step 5: Set Spotify secrets on Supabase

Run these from the repo root, replacing the placeholder values:

```bash
supabase secrets set SPOTIFY_CLIENT_ID=your_spotify_client_id
supabase secrets set SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
```

These are injected automatically into Edge Functions as environment variables. They are **not** exposed to the browser.

To verify secrets were set:
```bash
supabase secrets list
```

---

## Step 6: Deploy the Edge Function

From the repo root:

```bash
supabase functions deploy spotify-search
```

You should see output ending with a deployed function URL like:
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/spotify-search
```

The app calls this via `supabase.functions.invoke('spotify-search', …)` — no frontend env changes needed.

---

## Step 7: Test locally (optional)

1. Ensure `.env` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (see [SETUP.md](SETUP.md)).
2. Run the app:
   ```bash
   npm run dev
   ```
3. Log in → **Profile** → **What's powering your lift?**
4. Search for a song, pick one, confirm it shows with hours remaining.
5. Have a friend (or second account) accept a friend request and confirm the song appears next to your username on their friends list.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| "Spotify credentials not configured" | Secrets not set or function not redeployed after setting secrets | Re-run Step 5, then `supabase functions deploy spotify-search` |
| "Search failed. Check that Spotify is configured." | Function not deployed, or migration not run | Complete Steps 1 and 6 |
| 401 Unauthorized on search | Not logged in | User must be authenticated |
| Empty search results | Query too short (< 2 chars) or no matches | Type at least 2 characters |
| Function deploy fails | CLI not linked | Re-run `supabase link --project-ref …` |

---

## Updating the function later

After editing `supabase/functions/spotify-search/index.ts`:

```bash
supabase functions deploy spotify-search
```

No app redeploy is required unless you also changed frontend code.

---

## Storage note

Only song metadata and Spotify album-art URLs are stored (~1 KB per user). Images are loaded from Spotify's CDN, not Supabase Storage.
