# 25 improvements to be popular from day one

The lens: what makes a browser sandbox *grab* a Minecraft / Roblox / Brawl Stars
player in the first 60 seconds, keep them past day one, and make them send the
link to a friend? Three forces — **instant dopamine**, **a reason to come back**,
and **something to show off** — plus the table-stakes of polish, clarity, and
performance. Each item below: *why* it matters and *how* to build it modularly.

Priority: **P0** = build first (highest impact / unlocks a loop) · P1 · P2.

## A. Instant dopamine (first 60 seconds)
1. **Achievements / unlock toasts** — P0. *Why:* collection is the #1 retention
   driver; early ones (first mine/craft/build) fire dopamine in the first minute.
   *How:* `systems/Achievements.js` (pure check list) + unlock bigToast + a 🏆
   Journal section. **(building now)**
2. **Floating reward popups** (`+5 CP`, `+1 🟢`, damage numbers) — P0. *Why:*
   makes every action feel like it pays. *How:* a tiny float-text layer in the
   renderer fed by Game events.
3. **Juicier block break** — P1. *Why:* the core verb must feel crunchy. *How:*
   per-block-color shard particles + a short crack/scale on the target tile.
4. **Combo / streak feedback** — P2. *Why:* rewards flow. *How:* a mining/absorb
   streak meter that escalates particles + a small CP multiplier.

## B. Clarity & onboarding (don't lose them)
5. **Goal beacon** — P0. *Why:* "what do I do?" is the #1 churn cause. *How:* an
   on-screen arrow to the next objective target / nearest resource.
6. **Contextual first-action coach mark** — P1. *Why:* teach by doing, not text.
   *How:* a one-time pulsing highlight on the exact control the next step needs.
7. **Tooltips on every HUD control** — P1. *Why:* discoverability. *How:* title
   attributes (mostly done) + a long-press tooltip on touch.
8. **Loading splash + rotating tips** — P2. *Why:* perceived polish; teaches.
   *How:* a splash over asset load with a tip carousel.

## C. Reasons to come back (retention loops)
9. **Daily Challenge (dated seed)** — P0. *Why:* "come back tomorrow" loop +
   shared talking point. *How:* date→seed via the reality-code system; a landing
   card + a completion stamp.
10. **Run summary / stats screen** — P0. *Why:* closure + a shareable artifact.
    *How:* on death/era-up, a card of run stats (mined, built, ages, branches).
11. **Personal bests** — P1. *Why:* self-competition. *How:* persist best
    depth/era/CP/time in `Progress`; show on the landing.
12. **Collections progress meter** — P1. *Why:* completionism. *How:* a "X/Y
    discovered" bar on the landing pulling from clues/relics/achievements.
13. **Naming your civilization/world** — P2. *Why:* identity + investment. *How:*
    a name field saved with the world; shown in HUD/summary/share.

## D. Show off & share (virality)
14. **Share a screenshot card** — P0. *Why:* images travel further than links.
    *How:* compose a canvas card (world thumb + era + reality code) → download /
    Web Share API.
15. **Reality code QR** — P2. *Why:* phone-to-phone sharing. *How:* render the
    `?r=` URL as a QR in the share dialog.
16. **"Beat my reality" challenge links** — P1. *Why:* social competition. *How:*
    reality code + a target stat encoded together; summary compares.

## E. Visual & audio polish
17. **Per-era music themes** — P0. *Why:* mood + memorability; the biggest "feels
    finished" lever. *How:* simple layered Web Audio loops keyed by era/variant.
18. **Parallax sky & depth layers** — P1. *Why:* 2D worlds feel alive with
    parallax. *How:* multi-layer backdrop scroll in the renderer.
19. **Dynamic day/night + weather readability** — P1. *Why:* atmosphere + a clock
    the player can read. *How:* a small sun/moon clock in the HUD.
20. **Smooth camera + screenshake tuning** — P2. *Why:* game-feel. *How:* eased
    follow + capped shake (respect reduce-motion).

## F. Logic, depth & mobile
21. **First real branch age (🏛️ Trade Republic)** — P0. *Why:* proves the
    branching promise; two players diverge. *How:* per the era graph contract.
22. **Minimap / compass** — P1. *Why:* orientation in a big world. *How:* a
    corner minimap sampling the column-top map.
23. **Mobile haptics + control layout polish** — P1. *Why:* most players are on
    phones. *How:* `navigator.vibrate` on key events; tunable button size.
24. **Performance: chunk streaming + offscreen cull** — P1. *Why:* no jank = no
    bounce. *How:* generate/free chunks around the player.
25. **Accessibility: colorblind palette + font scale + SFX volume** — P1. *Why:*
    wider audience, fewer bounces. *How:* settings toggles wired to CSS vars /
    palette swaps.

## Build order
Start with the loops and dopamine that compound: **#1 Achievements → #2 Floating
popups → #9 Daily Challenge → #10 Run summary → #14 Share card → #17 Per-era
music → #5 Goal beacon → #21 Trade Republic**, then the P1 polish. Each ships as
its own tested, reversible release (modular system + test), consistent with the
rest of the codebase.
