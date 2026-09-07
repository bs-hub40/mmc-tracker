# MMC Tracker

Mobile-first dark-mode web app for daily pro-metabolic nutrition and activity tracking.

## Targets

| Macro | Goal |
| --- | --- |
| Calories | 2,236 kcal |
| Protein | 162 g |
| Fat | ≤ 78 g (ceiling) |
| Carbs | 222 g |
| Fiber | > 15 g |

## Accounts & settings

- **Local accounts** — username + password. Data stays in this browser.
- **Google accounts** — Continue with Google. Data syncs to a hidden **Drive appData** folder (not your visible files). Last write wins across devices.
- **Settings** — daily goals, AI keys, Google OAuth Client ID, Drive sync.

## Google sign-in + Drive (one-time Cloud setup)

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create a project.
2. Enable **Google Drive API**.
3. Configure **OAuth consent screen** (External is fine for your own Google account while in testing).
4. Create **Credentials → OAuth client ID → Web application**.
5. Add authorized JavaScript origins, for example:
   - `http://localhost:5500`
   - `https://bs-hub40.github.io`
6. Copy the client ID into **Settings → Google OAuth Client ID**, or into `js/config.js` (`GOOGLE_CLIENT_ID`) before you host.

Users then tap **Continue with Google**. MMC Tracker stores `mmc-tracker.json` in that Google account’s private app folder.

## Host on GitHub Pages

Live app: `https://bs-hub40.github.io/mmc-tracker/`

## Run

- Natural-language **meal** + **activity** logging via xAI Grok
- Energy balance: Food − Burned = **Net**, with calories remaining toward your goal
- Weight log with dated trendline
- Weekly & monthly net-calorie trends + goal streaks
- `localStorage` persistence per account


## Run

No build step. Open `index.html` in a browser (Chrome/Edge recommended).

1. Tap the gear icon → paste your `xai-` API key → Save  
2. Describe a meal in plain English → **Parse & Log**  
3. Watch macros and energy balance update  

Note: Grok logging needs network access to `api.x.ai`. If a browser blocks `file://` fetch, serve the folder locally (`python -m http.server` or `npx serve`).
