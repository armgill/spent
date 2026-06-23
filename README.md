# Spent

A dark-themed personal finance tracker with a social spending leaderboard. Log expenses, see daily/weekly/monthly summaries, and compare totals with friends.

**Live:** https://armgill.github.io/spent/

## Features

- **Expenses** — quick amount entry, categories, notes, and CSV import.
- **Summary** — daily, weekly, and monthly breakdowns by category (tap a category to see its expenses); remembers your chosen view.
- **Categories** — add and remove your own spending categories.
- **Leaderboard** — sign in to compare spending with friends. Add friends by username, with a podium and ranked list. Privacy is **totals-only**: friends see your total and ranking, never individual expenses.

Expenses are stored locally and, when signed in, synced to your account so they follow you across devices.

## Tech

- React 19 + TypeScript + Vite
- Tailwind CSS
- Supabase (auth, Postgres, row-level security) for the leaderboard backend
- Deployed to GitHub Pages

## Development

```bash
npm install
npm run dev      # start the dev server
npm run build    # production build
npm run deploy   # build + publish to GitHub Pages
```

## Backend setup

The leaderboard needs a Supabase project. Run [`db/schema.sql`](db/schema.sql) in the Supabase SQL editor to create the tables, row-level-security policies, and the totals-only `get_friend_totals` function. The project URL and anon key live in [`src/app/supabase.ts`](src/app/supabase.ts) (the anon key is safe to commit — it's protected by RLS).
