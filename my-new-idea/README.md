# BusinessBuilder AI — Demo App

Sales demo platform that generates a premium Hebrew business website (flooring company) with AI branding, WhatsApp lead funnel, before/after gallery, and a lead capture flow.

---

## Routes

| Path | Description |
|------|-------------|
| `/` | Client preview mode — loading animation → full website with browser chrome |
| `/demo` | Raw website (used by mobile iframe inside preview) |
| `/pricing` | Hebrew SaaS pricing page |

---

## Deploy to Vercel

### 1. Push to GitHub

```bash
git add -A
git commit -m "deploy"
git push
```

### 2. Import in Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the GitHub repository
3. Framework: **Vite** (auto-detected)
4. Build command: `npm run build`
5. Output directory: `dist`

### 3. Add environment variables (optional)

The app runs without Firebase — the demo pages are fully frontend-only.  
Firebase is only needed for the `/dashboard` and `/builder` routes.

If you want those routes to work, add these in **Vercel → Settings → Environment Variables**:

| Variable | Value |
|----------|-------|
| `VITE_FIREBASE_API_KEY` | your Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `your-project-id` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `your-project.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | your sender ID |
| `VITE_FIREBASE_APP_ID` | your app ID |

### 4. Deploy

Click **Deploy**. Vercel picks up `vercel.json` automatically — SPA routing and asset caching are pre-configured.

---

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build       # outputs to /dist
npm run preview     # serve /dist locally on port 4173
```

---

## Customizing the demo

When the app is running, click the **⚙** icon in the browser chrome bar to open the setup panel:

- **שם עסק** — business name (updates nav, footer, page title)
- **טלפון** — phone number (updates all call CTAs)
- **וואטסאפ** — WhatsApp number, digits only e.g. `972501234567`
- **לוגו** — upload logo image (replaces text in nav + footer)
- **תמונת רקע** — upload hero background photo (replaces the CSS wood art)

All settings are saved to `localStorage` and survive page reloads.

---

## Tech stack

- React 19 + React Router 7
- Vite 8 (rolldown bundler)
- Firebase 12 (Auth, Firestore, Storage) — optional
- No CSS framework — all styles are scoped with component namespaces (`fd-*`, `cp-*`, `pp-*`)
