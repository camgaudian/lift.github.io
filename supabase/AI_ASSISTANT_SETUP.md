# Nifty setup

Follow these steps after running [`migrations/007_ai_assistant.sql`](migrations/007_ai_assistant.sql) (and [`008_seed_more_exercises.sql`](migrations/008_seed_more_exercises.sql) if the expanded library is not applied yet).

## 1. Gemini API key

1. Go to [Google AI Studio](https://aistudio.google.com/) and create an API key.
2. Store it as a Supabase secret (never in the client):

```bash
supabase secrets set GEMINI_API_KEY="your-gemini-api-key"
```

Embeddings use `gemini-embedding-001` (768 dimensions). The deprecated `text-embedding-004` model no longer works.

## 2. Deploy the Edge Function

```bash
supabase functions deploy ai-assistant
```

The function uses `SUPABASE_URL` and `SUPABASE_ANON_KEY` automatically in production. It validates the caller's JWT before querying data or calling Gemini.

## 3. Ingest form articles

Form guidance lives in [`content/form-articles/`](content/form-articles/) (132 exercises). See [`content/README.md`](content/README.md) for the markdown format.

From the project root, with a **service role** key (local only — never commit):

```powershell
$env:GEMINI_API_KEY = "your-gemini-key"
$env:SUPABASE_URL = "https://YOUR_PROJECT.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key"
node scripts/ingest-form-articles.mjs
```

If `VITE_SUPABASE_URL` is in `.env`, you can omit `SUPABASE_URL`.

The script skips chunks already in the database (safe to resume after rate limits). Re-embed everything with `--force`. On the Gemini free tier (~100 embed requests/min), a full ingest takes roughly 6–8 minutes.

## 4. Verify

1. Sign in to Lift locally or on production.
2. Open Nifty from **Home** or an **Active workout**.
3. Ask "How do I bench press?" — you should get a streamed answer and a form disclaimer.
4. With **Include my workout data** off, ask "What's my bench PR?" — Nifty should explain it needs data access.
5. Turn the toggle on and ask again — it should return your actual PR from logged workouts.

## Troubleshooting

| Issue | Check |
|-------|--------|
| 401 Unauthorized | User must be signed in; JWT must be passed to the function |
| 500 Assistant not configured | `GEMINI_API_KEY` secret missing |
| No form guidance | Run ingestion script; confirm rows in `form_article_chunks` |
| Ingest 404 on embed | Use current script (`gemini-embedding-001`, not `text-embedding-004`) |
| Ingest 429 | Wait and re-run; script resumes skipped chunks automatically |
| Rate limit in app | Gemini quota exceeded; wait and retry |

## Security

- The Gemini key and service role key must never ship in the client bundle.
- User workout data is only queried when the user enables the toggle in the chat UI.
- All tool calls use the user's JWT; RLS and existing RPCs enforce access control.
