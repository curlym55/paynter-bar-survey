# Paynter Bar Survey — Setup Guide

## Overview
This is a Next.js app deployed on Vercel, using Supabase for data storage (same stack as the roster app).

---

## Step 1: Set up Supabase (5 mins)

1. Log into **supabase.com** → open your existing GemLife project (or create a new one)
2. Go to **SQL Editor**
3. Paste the entire contents of `sql/schema.sql` and click **Run**
4. This creates the `drinks`, `votes` tables, `vote_counts` view, and seeds all the starter drinks

---

## Step 2: Deploy to Vercel (5 mins)

1. Create a new GitHub repo called `paynter-bar-survey`
2. Upload all the project files (same as you did for the roster)
3. Go to **vercel.com** → **Add New Project** → select the repo
4. Before clicking Deploy, add **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key
   
   (These are the same values you used for the roster app — find them in Supabase under Settings → API)

5. Click **Deploy** — wait ~2 minutes
6. You'll get a URL like `https://paynter-bar-survey.vercel.app`

---

## Step 3: Embed in Wix (2 mins)

Add an HTML iframe element to your Wix page:

```html
<iframe
  src="https://your-vercel-url.vercel.app"
  style="width: 100%; height: 900px; border: none; border-radius: 12px;"
  title="Paynter Bar Survey"
></iframe>
```

---

## How the Survey Works

### Phase 1 — Suggestions
- Resident enters their name, browses categories, and suggests drinks
- Each suggestion is saved to the `drinks` table in Supabase
- Pre-seeded drinks are already in the database from the schema

### Phase 2 — Voting  
- Resident sees all drinks (seeded + suggested) grouped by category and price range
- They tick their favourites and submit — each tick is one vote
- The same person can't vote twice for the same drink (enforced by DB)

### Admin / Results (PIN: 1234)
- Shows leaderboard for each category with vote counts
- Can reset votes or remove user suggestions

**To change the admin PIN:** Open `src/app/PaynterBarSurvey.jsx`, find `'1234'` and replace with your preferred PIN.

---

## File Reference

| File | Purpose |
|------|---------|
| `sql/schema.sql` | Database setup — run once in Supabase SQL Editor |
| `src/lib/supabase.js` | Supabase client and all DB functions |
| `src/app/PaynterBarSurvey.jsx` | Main survey app component |
| `src/app/page.js` | Next.js page wrapper |
| `src/app/layout.js` | HTML layout |
| `package.json` | Dependencies |

---

## Costs

| Service | Cost |
|---------|------|
| Supabase Free | $0 |
| Vercel Free | $0 |
| **Total** | **$0/month** |
