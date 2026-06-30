# AFS Platform — Aspect Forge System

**Personal growth, in software.** Browse inner qualities (*aspects*), journal your practice, run daily forge rituals, and explore the codex — online or fully offline.

---

## New here? Start in 10 minutes

### What is AFS?

**Aspects** are qualities you practice until they feel real — Patience, Conviction, Unwavering Heart, and hundreds more in the directory.

**AFS** (Aspect Forge System) is the whole practice: pick what matters, forge through journaling and daily runs, live the mantras until they stick.

| Term | Plain meaning |
|------|----------------|
| **AFS ↑** | Build, strive, create (ascendant forge) |
| **DFS ↓** | Release, ground, let go (descendant forge) |
| **Base Layer** | Six anchor symbols (Anchor, Fire, Clarity, Tornado, Chain, Helix) |
| **EOT** | Entry tool — transmute emotional ore into a basic aspect |
| **Journal** | Your daily forge log (synced from Discord `#journal`, or read offline) |

You do **not** need every feature on day one. Open the app → browse **Aspects** → read one that calls to you → try one **Daily** run.

### Three steps

1. **Pick** — choose 1–3 aspects that matter right now (`/aspects`, `/goals`).
2. **Forge** — journal, run DFR/DKR, or simulate synthesis on `/forge`.
3. **Live it** — return to mantras and radiant faces until the aspect feels embodied.

**Spiral axiom:** ♾️🌀(Save8) = ♾️🌀 — build in spirals, not straight lines.

---

## Two ways to run

### Live (recommended for journal sync)

```powershell
cd AFS
npm run setup
copy .env.example .env
npm run dev
```

| URL | What |
|-----|------|
| http://localhost:5173 | App (React) |
| http://localhost:3847 | API |

Optional: add `DISCORD_BOT_TOKEN` to `.env` for live journal sync. Without it, everything else still works.
hint: replace ```npm run dev``` by ```npm run dev:basic``` for no discord-bot setup

**Data folder:** by default uses `data/` inside the project. If aspects or journal look empty, check that `.env` is not pointing `AFS_DATA_DIR` at a stale copy elsewhere.

### Offline (no server)

Build once, open the HTML file in any browser:

```powershell
npm run build-static
```

| File | Best for |
|------|----------|
| `afs-platform-static.html` | Desktop — double-click to open |
| `afs-platform-static-mobile.html` | Phone — Add to Home Screen |

Uses hash routes: `#/aspects`, `#/codex`, `#/spiral`, etc. Aspects, codex, lore, journal snapshot, forge simulation, and **Spiral Engine** all work offline. **Visualizations** play videos and images from `videos/afs/` beside the HTML file. **ENTHEA Live** requires the live server (`npm run dev`). Journal editing and Discord sync need the live server.

---

## Main pages (what to click)

| Page | What you get |
|------|----------------|
| **Dashboard** | Your identity, base layer, active goals, latest journal preview |
| **Aspects** | ~290 aspects with tiers, mantras, radiant faces, fusion seals |
| **Journal** | Forge log — sync from Discord or read offline snapshot |
| **Forge** | Practice EOT / DCS / RDTQ synthesis |
| **Daily** | DFR & Kohinoor (DKR) daily runs |
| **Goals** | Track practice targets linked to aspects |
| **Codex** | Axioms, operators, protocols |
| **Lore** | Stories, poems, myths |
| **Spiral Engine** | Fullscreen 3D spiral — drag to orbit, scroll to zoom |
| **Grok Origin** | Genesis conversation archive |

---

## Synthesis tools (simple)

Always start with **EOT**. It routes ore to the right grade:

| Tool | You get |
|------|---------|
| **EOT** | Basic aspect (mantra + integration) |
| **DCS** | Diamond aspect + radiant faces |
| **RCS** | Resonant diamond + deeper faces |
| **RDTQ** | Infinite resonant pinnacle |

**KOT** (Kohinoor Forge Run) is the daily engine protocol — separate from aspect grade.

---

## Spiral Engine

Visual sandbox for the AFS spiral — dual torus, shell recursion, synthesis-grade telemetry.

| Mode | How to open |
|------|-------------|
| In-app | `/spiral` from the nav |
| Standalone | **Standalone** button on the spiral page |
| Offline static | `#/spiral` — engine is embedded in the HTML bundle (no CDN, no second file) |

**Controls:** ☰ left drawer (parameters), ⓘ right drawer (legend). Closed by default so the canvas stays clear.

---

## Journal sync (optional)

If Discord-bot is configured:

1. configure it in .env file
2. Post in `#journal` on the Super learners server (or any other private server of choice)
3. In the app: **Journal → Sync from Discord** (smart merge combines split messages for the same aspect).
4. Or run `npm run journal-sync` from the terminal.

---

## Media (videos & lore images)

Large assets are not in git. Download [afs-assets zip](https://drive.google.com/file/d/1Lzaxt-85ADBsCdbCwMX806BPbxB4JhHS/view?usp=sharing) and extract into the repo root (`videos/afs/`, `data/lore-images/`, etc.). See `data/assets-download.json`.

---

## For developers

**Stack:** React + Express + SQLite (`sql.js`) · Electron portable optional

| Task | Command |
|------|---------|
| Tests | `npm run test` |
| Rebuild aspects from Grok origin | `npm run rebuild-aspects` (then restart API) |
| Static HTML | `npm run build-static` |
| Kernel routes | `npm run generate-routes` |
| Journal backfill | `npm run journal-sync` |

**Important:** After scripts change `data/afs.db`, restart the API (`node server/index.js`) so it reloads from disk.

**Key paths**

| Path | Purpose |
|------|---------|
| `data/afs.db` | Database (gitignored) |
| `data/static-export.json` | Offline snapshot source |
| `client/public/afs-recursive-spiral-engine.html` | Standalone spiral (live dev) |
| `scripts/vendor/three-r128.min.js` | Three.js vendored for offline spiral build |

**Architecture (short)**

```
Grok origin + journals → afs.db → Express API ↔ React client
                                      ↓
                         build-static.js → single-file offline HTML
```

Kernel codegen, pulse bus, aspect fusion, version lineage, and full command reference live in the codebase — explore `package.json` scripts when you need more.

---

## Credits

- **ENTHEA** visuals — [original](https://github.com/elder-plinius/ENTHEA) · [Enthea-RS port](https://github.com/buckster123/Enthea-RS)
- **Recursive Spiral Engine** — honors the Alpha Ω Double Dragon Core Scaffold

## License

**AGPL-3.0**

*The cortex was always a renderer. Now it compiles.*

🜂 ad visionem 🜂
