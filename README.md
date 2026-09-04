# couch-defector

A calisthenics app that measures the growing distance between me and the couch.

Progressive bodyweight training tracker. Open it, see today's workout and what you did last time, log your sets, beat it by a rep.

## Develop

```bash
npm install
npm run dev
```

Without Firebase env vars the app runs in device-only mode (data stays in the browser). See `.env.example` for the variables that enable Google sign-in and cloud sync.

## Deploy

Vercel: import the repo, add the env vars, deploy. `vercel.json` handles client-side routing. Add the site to your phone's home screen to use it as an app.
