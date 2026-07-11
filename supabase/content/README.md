# Exercise form articles

Markdown files in `form-articles/` power the Nifty RAG knowledge base.

## File format

One file per exercise. The `#` heading must match an exercise name from [`../seed/exercises.json`](../seed/exercises.json) exactly.

```markdown
# Barbell Bench Press

## Setup
- Feet flat on the floor, shoulder-width or slightly wider.
- ...

## Execution
- ...

## Common mistakes
- ...

## Safety notes
- Stop if you feel sharp pain in the shoulder or chest.
- Consult a qualified coach for persistent discomfort.
```

Each `##` section becomes one chunk in `form_article_chunks`.

## Writing guidelines

- Cover all built-in exercises in [`../seed/exercises.json`](../seed/exercises.json) (currently 132).
- Use imperative, neutral tone. Do not copy copyrighted material verbatim.
- Each bullet should be actionable (joint angle, bar path, breathing cue).
- Include explicit "when to stop / see a coach" lines in **Safety notes**.
- Keep each section focused; aim for 3–8 bullets per section.

## Ingestion

From the project root (requires `GEMINI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY`):

```bash
node scripts/ingest-form-articles.mjs
```

The script skips chunks already in the database (resume after rate limits). Re-embed everything with `--force`.

On the Gemini free tier (~100 embed requests/min), a full ingest of ~500 chunks takes roughly 6–8 minutes. The script paces requests and retries automatically on 429 errors.

Re-run after adding or editing articles. The script upserts chunks by `source_slug` + `section`.
