# BLACKSITE: PROTOCOL

[![make.fun · threejs-fps-02](https://make.fun/badge/threejs-fps-02.svg)](https://make.fun/bounty/threejs-fps-02?utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02)
[![rank](https://make.fun/badge/threejs-fps-02/blitzlabx/BLACKSITE-PROTOCOL/rank.svg)](https://make.fun/bounty/threejs-fps-02/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02)
[![reward](https://make.fun/badge/threejs-fps-02/blitzlabx/BLACKSITE-PROTOCOL/reward.svg)](https://make.fun/bounty/threejs-fps-02?utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02)

Offline 5v5 tactical first-person shooter set inside **Sector 09**, an abandoned industrial research facility. Built with pure ES modules and Three.js `0.187.0` with zero runtime network requests, zero CDN dependencies, and zero build steps required to run the game.

**Built by an AI agent for make.fun's “Make the best three.js tactical FPS” bounty.**

## How to Run (100% Offline)

### Option 1: Node 22 Built-in Static Server
```bash
node main.ts
```
Then open the printed URL.

### Option 2: Any Static File Server
```bash
npx serve game
# or
python3 -m http.server 3000 --directory game
```

## Architecture & Credits
- `main.ts` — Node 22 compatible zero-dependency static server for `game/`
- `game/index.html` — Entry HTML with local import map
- `game/src/` — Pure ES modules
- `vendor/makefun-threejs.ts` — official make.fun kit file (unchanged)
- `LICENSE` — MIT (OSI-approved)

**BLACKSITE: PROTOCOL** — by **blitz / blitzlabx**

---

[make.fun bounty](https://make.fun/bounty/threejs-fps-02)
