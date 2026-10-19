# Pointless

A quiet place for tasks, notes, links and reminders. Built for people who find Notion overwhelming.

Created for you. Catered for you.

## What it does

- **One box.** Type anything on Today. It guesses whether it is a task, note, link or reminder
  (`remind me friday 3pm`, `buy milk`, a URL, or a thought). One tap changes the guess.
- **Today stays short.** Due things, pinned things, things you keep reaching for, and what you just dropped.
- **Everything** is one searchable list. Filters are ordered by how much you actually use each type.
- **Space** is an open page to think on and a surface to sketch on.
- **It adjusts over time.** Items you open often float up. Items untouched for 3 weeks are tucked away
  (never deleted). Finished tasks tuck after 3 days. After enough use it notices when you tend to capture things.
- **No branding** anywhere except the About page. The person names their own space and picks one color.
- **Local first.** Everything is in the browser's storage. Back up and restore as JSON from the You page.
- Installs as a PWA on a phone.

## Stack

Vite 7, React 19, TypeScript, Tailwind 4, zustand (persisted), react-router 7, lucide icons.
Same shape as intelleq-bm.

```
npm install
npm run dev
npm run build
```

## Layout

- `src/lib/parse.ts` reads plain-English captures into a type, title and due time.
- `src/lib/adapt.ts` is the "grows with you" logic: reach-for scoring, tucking, type ordering, routine hint.
- `src/lib/store.ts` is the single persisted store.
- `src/pages/` Today, Everything, Space, ItemPage, You, About, Welcome.

## Next

- Sync across devices (needs an account and a backend).
- Proper push reminders when the app is closed (needs a service worker).
- Fetch page titles for links.
- Share-to-app from the phone.
