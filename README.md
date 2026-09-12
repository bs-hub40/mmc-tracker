# Log it

AI powered food, activity, and weight tracker.

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
- **Google accounts** — Continue with Google. Data syncs to a **Log it** folder on that person's Drive.
- **Settings** — submenu for goals, instant quick actions, AI setup (Grok, Claude, ChatGPT, Gemini), and account / Drive.

People who use the app never create a Google Cloud project. They tap **Continue with Google** and Allow.

## Google Cloud (app owner, once)

The OAuth Client ID in `js/config.js` is already the shared app credential. Random users must not paste a client ID.

To let anyone with a Gmail sign in (not only listed testers):

1. [Google Auth Platform → Audience](https://console.cloud.google.com/auth/audience) → **Publish app**.
2. On **Data Access**, keep only identity (`openid` / `email` / `profile`) and **`drive.file`**. Remove `drive.appdata` if it is listed — that scope is sensitive and blocks casual sign-in.
3. Set the privacy policy URL to `https://bs-hub40.github.io/mmc-tracker/privacy.html`.
4. Confirm Drive API is enabled and the JavaScript origin is `https://bs-hub40.github.io` (no path).

Users still see Google's one-time Allow screen. That is required; it is not Cloud Console setup.

## Host on GitHub Pages

Live app: `https://bs-hub40.github.io/mmc-tracker/`

## Run

- Natural-language **meal** + **activity** logging via hosted AI (Gemini)
- **Vitamins & minerals** tab: day-scoped micros from food text, with % of adult DRI targets
- Energy balance: Food − Burned = **Net**, with calories remaining toward your goal
- Weight log with dated trendline
- Weekly & monthly net-calorie trends + goal streaks
- `localStorage` persistence per account, plus Drive sync for Google accounts


## Run

No build step. Open `index.html` in a browser (Chrome/Edge recommended).

1. Gear icon → pick Grok, Claude, ChatGPT, or Gemini → follow the two cards → paste the key → Save  
2. Describe a meal, a workout, or a whole day → **Log It**  
3. Watch macros and energy balance update  

Note: Logging needs network access to the provider you chose. If a browser blocks `file://` fetch, serve the folder locally (`python -m http.server` or `npx serve`).
