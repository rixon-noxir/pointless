# Pointless

A quiet place for tasks, notes, links and reminders. Built for people who get overwhelmed by big workspace apps.

Created for you. Catered for you.

## What it does

- **One box.** Type anything on Today. It guesses whether it is a task, note, link or reminder
  (`remind me friday 3pm`, `buy milk`, a URL, or a thought). One tap changes the guess.
- **Today stays short.** Due things, pinned things, things you keep reaching for, and what you just dropped.
- **Everything** is one searchable list. Filters are ordered by how much you actually use each type.
- **Space** is an open page to think on and a surface to sketch on.
- **Pick one for me.** When you cannot decide, `/now` picks one thing, shows it alone, and starts a five-minute timer.
  "Done" or "Not this one". Nothing else to choose.
- **It adjusts over time.** Items you open often float up. Items untouched for 3 weeks are tucked away
  (never deleted). Finished tasks tuck after 3 days. After enough use it notices when you tend to capture things.
- **Rhythms, not deadlines.** Finish the same chore twice and it offers to bring it back on a rhythm counted from
  when you finish it, so a late finish just shifts the schedule. Set it by hand on any task too.
- **One nudge a day.** Optional single "here is today" notification at the hour you tend to show up. Fires while
  the app is open or installed; true background push needs a backend (next).
- **Share to it.** On Android, the installed app appears in the share sheet; shared text lands in the capture box.
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
- `src/lib/adapt.ts` is the "grows with you" logic: reach-for scoring, tucking, type ordering, routine hint, repeat detection, pick-one.
- `public/sw.js` is a minimal service worker: offline shell, notification clicks. Registered in production builds only.
- `src/lib/store.ts` is the single persisted store.
- `src/pages/` Today, Everything, Space, Now, ItemPage, You, About, Welcome.

## Next

- Sync across devices (needs an account and a backend).
- Push reminders and the daily nudge when the app is closed (needs a push backend).
- "Break this down" into a first small step (AI, needs a backend).
- Fetch page titles for links.
- Share-to-app from the phone.
