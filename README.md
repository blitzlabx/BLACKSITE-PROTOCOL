# BLACKSITE: PROTOCOL

Offline 5v5 tactical first-person shooter set inside **Sector 09**, an abandoned industrial research facility. Built with pure ES modules and Three.js `0.187.0` with zero runtime network requests, zero CDN dependencies, and zero build steps required to run the game.

## How to Run (100% Offline)

### Option 1: Node 22 Built-in Static Server
```bash
node main.ts
```
Then open `http://localhost:3000` in Chrome.

### Option 2: Any Static File Server
```bash
npx serve game
# or
python3 -m http.server 3000 --directory game
```

### Unit Tests
```bash
node --test game/tests/core-logic.test.mjs
```

## Sector 09 Map Zones
- **The Foundry (West Wing)**: Multi-elevation industrial hall featuring an elevated steel catwalk, twin access ramps, central smelting furnace, and staggered cargo cover.
- **The Core (Center)**: Primary objective containment site where Attackers plant the Core Charge and Defenders hold or defuse.
- **Service Tunnels (East Wing)**: Tight flanking corridors, mid-connector valve room, overhead coolant piping, and emergency red beacons.

## Controls
- `W A S D` — Move (`Shift` Walk, `C` / `Ctrl` Crouch, `Space` Jump)
- `Mouse` — Aim (`Click` to lock pointer)
- `Left Click` — Fire
- `Right Click` — Aim Down Sights / Sniper Scope
- `R` — Reload
- `1` / `2` — Switch Primary / Sidearm
- `B` — Open Armory Buy Menu (during Buy Phase)
- `E` — Hold to Plant / Defuse Core Charge
- `Tab` — Hold for Tactical Scoreboard
- `M` — Mute / Unmute Audio
- `Esc` / `P` — Pause Menu

## Weapons & Economy
- **Kestrel** ($400) — Precision semi-auto sidearm
- **Vektor-9** ($1,250) — High-RPM close-quarters SMG
- **HAWK-12** ($1,600) — 8-pellet pump tactical shotgun
- **ARX-17** ($2,700) — Balanced full-auto assault rifle
- **M4K** ($3,200) — High-damage precision marksman rifle
- **Longshot** ($4,500) — Bolt-action scoped sniper rifle

## Architecture & Credits
- `main.ts` — Node 22 compatible zero-dependency static server for `game/`
- `game/index.html` — Entry HTML with local import map (`three.module.min.js` + `three.core.min.js`)
- `game/src/` — Pure ES modules (`main.js`, `engine.js`, `renderer.js`, `map.js`, `navigation.js`, `player.js`, `weapons.js`, `combat.js`, `bots.js`, `rounds.js`, `economy.js`, `objectives.js`, `audio.js`, `effects.js`, `settings.js`, `ui.js`, `room-environment.js`)
- Supports desktop (`WASD + Mouse`) and auto-detected mobile touch controls (virtual thumbstick + touch action buttons) with full Settings menu (`Sensitivity`, `Invert Y`, `Master/SFX Volume`, `Crosshair`, `Minimap Size`, `Mobile HUD Opacity/Scale`).
- `screenshots/` — Live WebGL captures from Chrome

**BLACKSITE: PROTOCOL** — by **blitz / blitzlabx**
