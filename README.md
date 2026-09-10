# Couch Defector

A calisthenics app that measures the growing distance between me and the couch.

Progressive bodyweight training tracker. Open it, see what's due today and what you did last time, log your sets, beat it by a rep. Live at [couch-defector.vercel.app](https://couch-defector.vercel.app).

## How it works

- **Six movements, ten steps each.** Push-up, squat, pull-up, leg raise, bridge, and handstand each progress through ten steps from easy variations to the hard one-limb versions. Every step carries three standards: beginner (where a new step starts), intermediate, and progression. Hit the progression standard and the app tells you to move up.
- **Trifecta on rest days.** Bridge hold, L-hold, and twist hold, each with a five-step ladder and a seconds counter per chunk. Logged as mobility, never counted as training.
- **Programs.** The five routines as weekday schedules: New Blood (Mon/Fri), Good Behavior (Mon/Wed/Fri), Veterano (one movement a day, six days), Solitary Confinement (six days, every movement twice, plus grip, calf, and neck work), Supermax (two movements a day, six days, at very high volume). The app shows today's workout, or the next one on a rest day.
- **Today.** One screen, and the only one you need: an activity grid of the last 26 weeks, then the day's workout with logging right there. Each exercise is prefilled with last time's sets; tick sets off as you go, tap a number to adjust it. Drafts survive leaving the screen or closing the app. Swipe the workout area right to step back through past days, or tap any past cell in the grid. A logged workout is edited in place, under the day it belongs to.
- **How to do it.** The info button next to an exercise opens the step: photographs, the three standards, what the movement is for, and the rules that apply to every set.
- **Sign in with Google** to sync across devices. Without sign-in configured, the app runs in device-only mode and keeps data in the browser.

Monochrome, light only, no shadows, installable on a phone home screen.

## Sources

The training system is Paul Wade's, not mine. The app is a way to follow it and no substitute for reading him.

- **The ladders.** The six ten-step progressions, and the beginner, intermediate, and progression standards for every step, come from Convict Conditioning. See `src/data/progressions.ts` and `src/data/cc1-steps.ts`. The step photographs in `public/steps` are from the same book.
- **The routines.** New Blood, Good Behavior, Veterano, Solitary Confinement, and Supermax come from the routine tables in Convict Conditioning. See `src/data/programs.ts`.
- **The Trifecta.** The three rest-day holds come from Convict Conditioning 2. See `src/data/trifecta.ts`.
- **Movement notes and rep bands.** The per-movement guidance and the rules shown on every exercise come from C-Mass. See `src/data/technique.ts`.

Convict Conditioning, Convict Conditioning 2, and C-Mass are by Paul Wade. This is a personal training app with no affiliation to the author or his publisher. Buy the books.

## Stack

React 19, TypeScript, Vite, Tailwind v4, shadcn/ui, React Router, Firebase Auth and Firestore, `vite-plugin-pwa`. Deployed on Vercel.

## Develop

```bash
npm install
npm run dev
```

`npm run typecheck` runs the TypeScript build. `npm run build` produces the production bundle.

Copy `.env.example` to `.env.local` and fill in the Firebase values to enable Google sign-in locally. Leave them empty for device-only mode.

### Dev tooling

- **Prototype controller.** In dev builds, click the flask button bottom left or press Cmd+period. It loads sandbox scenarios (new account, rest day, ready to move up, veteran with 20 weeks of history) without touching real data, flips idea flags for UI variants, jumps between screens, and edits sandbox data. Add a flag in `src/dev/ideas.ts` and read it with `useIdea()`.
- **Agentation.** Dev builds mount a feedback toolbar for annotating the UI in the browser. It posts to a local `agentation-mcp server` on port 4747.

## Layout

```
src/
  data/         progressions (steps and standards), per-step detail, programs, Trifecta, technique
  lib/          store (local or Firestore), schedule, stats, firebase
  pages/        Today, Settings, SignIn, Onboarding
  components/   workout form, Trifecta form, day swiper, activity grid, technique sheet, header, shadcn/ui
  dev/          prototype controller, scenarios, idea flags, Agentation
design/         alternate icon concepts
```

## Deploy

Vercel builds from `main` on every push. Set the four `VITE_FIREBASE_*` variables in the project's environment settings. `vercel.json` rewrites all routes to `index.html` for client-side routing.

Add the site to your phone's home screen to use it as an app. iOS caches the icon at install time, so re-add after an icon change.
