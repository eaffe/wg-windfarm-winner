# WG WindFarm Winner

**Raise the capital. Acquire the projects. Create the upside. Maximise investor net IRR.**

A standalone English-language strategy game for renewable-infrastructure colleagues. Modelled as a fictional **six-year fund** (24 quarters) with fundraising, acquisitions, engineering value creation, construction financing, sales and an LP returns leaderboard. The game runs in the browser and is usable offline. It uses only standard HTML/CSS/JavaScript, so GitHub Pages can host it without a build step.

## Strategies and deal execution

| Investment strategy | Acquire | Optimise | Realise |
|---|---|---|---|
| Greenfield development rights | Permitted/onshore wind project rights | Turbine upsize, layout, O&M renegotiation, PPA | Sell development rights or build, operate and exit |
| Brownfield / repowering | Existing operating wind farm | Repowering, grid optimisation, reset service agreements | Re-finance construction, operate and exit |
| Hybrid Wind + BESS | Wind-plus-battery development rights | BESS enlargement, dispatch, co-optimisation, OpEx / PPA | Finance, operate and exit the hybrid facility |

Every quarter has **three incoming opportunities**, selectable by asset category. Each opportunity is either a **structured competitive M&A** process (bid strategies and win probabilities) or a **direct bilateral acquisition** (seller negotiation / exclusivity). Players can spend on diligence to reduce surprise risk, but the cost reduces their fund's return. Unsuccessful binding bids are lost opportunities, not repeatable for free.

## Fund mechanics

- Raise equity from Family Offices, Institutional Infrastructure LPs and Energy Transition LPs. Investor funds are **called immediately** when a campaign closes (simplified gameplay convention).
- Buy rights, pay transaction fees, spend on engineering optimisation, fund **40% construction equity** with assumed **60% senior project debt**, and schedule COD.
- Commissioned assets generate quarterly cash yield net of *illustrative* interest expense. Changes in market power prices, valuations and borrowing rates create scenario risk.
- Sell rights, construction-stage holdings or operational assets. Exit proceeds are net of a simplified **12% GP carry on positive project profits**, and up to 80% is distributed to LPs.
- The objective is **annualised LP net IRR**, computed by discounting all negative LP contributions and positive distributions across quarterly dates. An indicative mark-to-market IRR includes liquid cash and unrealised NAV. The final IRR is measured after fund liquidation.
- 1.1% annual management fee on capital raised, quarterly, plus fundraising costs. Fund mandate has €500m commitment cap.
- The leaderboard displays opt-in user nicknames and completed fund LP IRR, with a clear disclaimer that runs are **not independently verified**.

**Warning:** Every project, market assumption, turbine, power price and return in this game is fictional/illustrative. The game does not use any employer, fund, transaction, or client data. **Do not use these game outputs for underwriting, investor presentations, asset valuation or investment decisions.** No assurance of results is made.

## Local run

```bash
python3 -m http.server 8000
# Open http://localhost:8000
node --test tests/*.test.js
```

## GitHub repository and deployment

This is the clean public repository at `eaffe/wg-windfarm-winner`. It contains the WG WindFarm Winner game only, separate from Mech-Freunde. The project is an independent, fictional investment simulation with no employer transactions or other corporate information. **Only publish fictional game content.**

The site is deployable at `https://eaffe.github.io/wg-windfarm-winner/` via `.github/workflows/pages.yml`. In repository **Settings → Pages**, select **GitHub Actions** as the source; the workflow deploys when `main` is updated.

If the site is not accessible yet, inspect **Actions → Deploy WG WindFarm Winner to GitHub Pages** and verify Pages is enabled. A successful GitHub Actions run is required before considering the game live.

## Dedicated Supabase environment

The app is configured to its dedicated **WG WindFarm Winner** Supabase project, ref `jhrtlpfmvhmrqpimdeiz`, EU West (Ireland). The public project URL and **publishable** key are committed in `src/config.js`; secret/service-role keys never belong in this repository. The database already has its separate `wfw_profiles` and `wfw_runs` tables, matching RLS policies, account-creation trigger, and restricted opt-in leaderboard function. `supabase/schema.sql` documents the database schema; do **not** re-run it on an already initialised database without checking for duplicates.

The remaining account configuration is in the Supabase dashboard: 
- Authentication → Providers → verify **Email** is enabled; use email/password sign-in.
- Authentication → URL Configuration → set the Site URL to the final deployed URL and add `https://eaffe.github.io/wg-windfarm-winner/**` as an allowed redirect. This is necessary for email verification links and password resets.
- Configure production SMTP for reliable team-wide confirmation emails; the default mail sender may be rate limited.

**Accounts and leaderboard are opt-in.** The app itself can be played offline without any Supabase session.

### Security and data model

- Supabase Auth stores email and password hashes; the game stores no plaintext passwords or emails.
- Player names are free text, 3–30 characters. Public leaderboard visibility is **off by default**.
- Per-user RLS restricts access to cloud game runs and profiles. An authenticated RPC exposes only opt-in nicknames and scores.
- Browser-computed scores are subject to manipulation. For any prize-linked competition, implement a verified server-side game engine or score replay before using the leaderboard.
- Browser local storage is used for offline autosave, and does not synchronise automatically until the player signs in and the new Supabase project is configured.

## Roadmap

- Team tournaments with seeded standardised deal scenarios and locked assumptions.
- Deep leverage structuring, covenant tests, debt sculpting and refinancing.
- Detailed permitting, P50/P90 resource assessment and scenario Monte Carlo.
- Merchant vs PPA vs route-to-market stress tests; DSCR and downside distributions.
- ESG / grid impact, co-development and portfolio concentration constraints.
- Secure server-side scoring for prizes / competitive leaderboards.

© Game concept for internal team fun and learning. This project is an independent simulation and is separate from Mech-Freunde.