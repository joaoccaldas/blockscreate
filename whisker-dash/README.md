# Whisker Dash

A browser-based 3D cat parkour escape game. Race through apartments, collect sardines, dodge household hazards, and reach the front door before it closes.

## Play

GitHub Pages path: `https://joaoccaldas.github.io/blockscreate/whisker-dash/`

## Features

- Three apartment themes: Sunbeam Flat, Skyline Penthouse, and Midnight Loft
- Four custom procedural cat skins with animated tails, paws, ears, and running cycles
- Run, jump, wall-jump, pounce, checkpoints, rescue, moving furniture, Roombas, fans, and laser grids
- A physically closing front door and time-bonus sardines
- Solo play plus optional PeerJS room-link multiplayer
- Keyboard, mouse, and mobile touch controls
- Procedural Web Audio music and effects
- Installable PWA shell and offline caching after first load
- Static hosting only, with no project-specific backend, accounts, analytics, secrets, or API keys

## Controls

| Input | Action |
|---|---|
| WASD / arrows | Move |
| Mouse | Camera |
| Space | Jump / wall-jump |
| Shift | Pounce |
| R | Return to checkpoint |
| Escape | Pause |

Mobile controls appear automatically.

## Multiplayer

The host creates a room and shares its generated link. Gameplay state is sent peer-to-peer. The game has no private backend, although room discovery depends on the public PeerJS signaling relay and internet access.

## Architecture

This release is a static classic-script deployment for maximum compatibility with GitHub Pages:

- `index.html` and `styles.css`: application shell and responsive UI
- `deploy/core.js`: rendering, state, materials, colliders, and shared utilities
- `deploy/world.js`: procedural apartment environments and hazards
- `deploy/player.js`: cat model, controls, physics, checkpoints, networking state, and results
- `deploy/ui.js`: menus, lobby, input, mobile controls, and game loop
- `deploy/audio.js`: procedural Web Audio soundtrack and effects
- `deploy/multiplayer.js`: PeerJS room lifecycle and state relay

## Privacy and safety

- No camera, microphone, geolocation, cookies, tracking, or personal-data permissions
- Player names are length-limited and escaped before rendering
- Room IDs are validated before connecting
- Third-party CDNs provide Three.js, PeerJS, and fonts

## License

MIT
