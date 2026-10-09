# Jungle Run: Savanna Stampede

Status: level design and generated artwork complete; gameplay integration is planned.

Proposed stage 8, after DinoLand. The monkey leaves the jungle for sunlit golden grass, acacia trees and rocky ravines. Friendly giraffes help it survive laughing hyena packs and a wildebeest stampede. A fierce roaring lion guards the last stretch before the Oasis of Victory.

## Encounter sequence

Use the existing difficulty durations: Easy 42 seconds, Medium 51 seconds, Hard 60 seconds. The table uses normalized progress so all difficulties include every encounter. Times are pacing targets, not automatic victory triggers.

| Progress | Medium target | Encounter | Player action |
| --- | --- | --- | --- |
| 0–15% | 0–8s | Golden Grasslands: a friendly giraffe demonstrates a safe launch, with bananas tracing the route. | Jump onto its back; it gently launches the monkey forward. |
| 15–30% | 8–15s | Laughing Hyena Pack: enemies appear in staggered pairs or trios. | Slide under a high leap, jump a low rush, or counter during recovery. |
| 30–50% | 15–26s | Wildebeest Stampede: rising dust and visible herd silhouettes announce two waves. | Jump separated waves or use a giraffe to reach a safe upper route. |
| 50–70% | 26–36s | Cliffs of Death: bone-strewn sandstone ledges, narrow pillars and a crumbling platform. | Follow banana arcs with double jumps and giraffe launches. |
| 70–92% | 36–47s | Roaring Lion: a flat, clearly bounded showdown arena. | Read the roar and crouch, dodge alternating pounces and charges, counter in recovery. |
| 92–100% | 47–51s | Oasis of Victory: a final giraffe-assisted crossing opens onto lush turquoise water and a leafy finish arch. | Land safely and cross the arch to complete the stage. |

## Creatures and challenge rules

**Lion.** Use an explicit `stalk → roar → windup → pounce/charge → recover` state machine. The roar is a warning, with a visible mane/head animation and a short action cue; it does not deal unavoidable damage. Pounces rise high enough to slide beneath; ground charges allow a double jump. Give the player a clear counter window after either attack. Proposed hit points: Easy 3, Medium 4, Hard 5, using the existing attack damage and hit cooldown rules. The lion retreats when defeated. Never combine the arena with a live cliff or stampede.

**Friendly giraffes.** Never damage or block the monkey. Descending onto the back gives an automatic forward/upward launch using the existing bounce interaction. Draw the safe landing surface at the back, rather than making the head a hidden target. A banana arc shows the destination. Giraffe launches reset the air-jump allowance so the player can correct a landing. Put a giraffe before every gap requiring more range than the normal double jump. Provide a heart before the lion arena.

**Wildebeest.** Repeat the gallop sheet with phase offsets for a herd. Dust and silhouettes begin before collision becomes possible. The stampede advances in bounded waves with real safe gaps, rather than a continuous wall of bodies. A normal hit costs one life under existing protection rules. Invulnerability prevents repeated hits from the same wave. Giraffe routes remain clear of the herd. No herd spawns onto a cliff landing.

**Laughing hyenas.** Reuse one animated character to form staggered packs. A laugh pose and visible cue announce the next attack. Alternate high bounds and low rushes; only one hyena starts an attack at a time on Easy and Medium. Hard may use two offset attacks, but must preserve a valid dodge route. Knockback and counter attacks use the existing combat controls. Laughter audio is an implementation task; no sound files are included in this asset pack.

**Cliffs of Death.** Deep ravines show old animal skulls, ribs and scattered bones. Bones are scenery; the pit is the hazard. Ordinary double-jump gaps must be reachable at the selected difficulty and current speed. Wider gaps always have a giraffe or stable intermediate pillar. Preview the far ledge before takeoff. A crumbling platform visibly cracks before it falls, with at least 0.8 seconds after first landing. Falling costs one life and respawns the monkey at the last safe ledge, with temporary protection and cleared nearby hazards. Zero lives ends the run. Star power can protect against creatures but does not create invisible ground over pits.

**Oasis of Victory.** Water stays behind the solid playable path. Stop hostile spawning before the finish stretch and despawn trailing attackers. Victory requires the lion to be defeated and the monkey to cross the oasis finish trigger while grounded; the timer alone must never award victory before the arena is resolved. In Adventure, enter the usual final celebration and score submission. In selected-stage mode, complete only this stage.

## Difficulty targets

| Setting | Easy | Medium | Hard |
| --- | --- | --- | --- |
| Duration / lives | Existing 42s / 5 | Existing 51s / 3 | Existing 60s / 2 |
| Minimum attack warning | 1.2s | 0.9s | 0.7s |
| Lion recovery opening | 1.1s | 0.85s | 0.65s |
| Hyenas per pack | 2 | 3 | 4 |
| Wildebeest waves | 2 short waves | 2 longer waves | 3 waves |
| Cliff route | Wide ledges, stable pillar | One cracking platform | Narrower ledges, two cracking platforms |

Keep cliff and creature encounters separate until each action has been taught. Place warnings using time-to-contact at actual travel speed, including dash and espresso boosts. The existing 800 × 400 canvas limits visibility: if a warning would need to start off-screen, show an on-screen cue or temporarily reduce approach speed. Target the existing late-game pace first, then tune by playtesting; do not increase speed simply because this is stage 8.

## Artwork delivered

The built-in imagegen tool produced six versioned PNGs in `public/games/`. The animal sheets each contain eight poses. The terrain sheet contains six objects. Alpha transparency was verified from the actual files, not inferred from the previews.

| Asset | File | Dimensions | Contents |
| --- | --- | --- | --- |
| Roaring lion | `jungle-savanna-lion-v1.png` | 1774 × 887 RGBA | Stalk, pre-roar, roar, crouch, pounce, land, charge, recover |
| Friendly giraffe | `jungle-savanna-giraffe-v1.png` | 1774 × 887 RGBA | Idle, two walk poses, look down, neck bend, crouch, launch, celebrate |
| Wildebeest | `jungle-savanna-wildebeest-v1.png` | 1774 × 887 RGBA | Eight gallop poses for repeated herd members |
| Laughing hyena | `jungle-savanna-hyena-v1.png` | 1774 × 887 RGBA | Stalk, laugh, crouch, pounce, two gallops, land, recover |
| Bone cliffs | `jungle-savanna-cliffs-v1.png` | 1536 × 1024 RGBA | Two cliff ledges, pillar, bone mound, crumbling platform, skull ledge |
| Victory oasis | `jungle-savanna-oasis-v1.png` | 1774 × 887 RGB | Golden savanna, turquoise pool, foliage arch and dry foreground path |

Full generation prompts and the final cliff edit prompt are in `public/games/jungle-savanna-assets-v1.md`. Image previews are already available in this conversation.

The generated sprite spacing varies, including some poses extending beyond their intended grid cells. Measure source rectangles and check neighboring-pose contamination before animating; do not slice blindly into equal cells. Preserve native aspect ratios and anchor animals consistently at their feet. The giraffe launch poses change silhouette substantially, so align the gameplay back surface independently of image bounds. The cliff art is decorative; define horizontal platform collision surfaces separately. The oasis image is a finish backdrop, not a seamless scrolling tile. Render the earlier savanna sky and acacia parallax with the established canvas scenery approach.

## Implementation work

1. Add Savanna Stampede to `LEVELS` and a stage gem entry to `GEMS` in `lib/jungle-runner.ts`; keep gem tracking arrays aligned. Proposed gem: Citrine, warm golden yellow.
2. Add `lib/jungle-savanna.ts` with explicit creature states, ordered encounter scheduling, giraffe supports, cliff collision/respawn and the lion completion gate. Reset prior-stage entities on entry and clean up savanna entities on exit.
3. Add `lib/jungle-savanna-art.ts` for measured sprite frames and savanna drawing. Load the new local assets in `components/jungle-runner.tsx` and preserve the existing keyboard/touch controls.
4. Replace assumptions that DinoLand is the last stage. The stage picker currently labels only the final entry as a boss stage; label both DinoLand and Savanna correctly. Update the seven-level canvas description, level count and score metadata for the new stage.
5. Gate final victory on completed lion encounter and grounded oasis crossing, while retaining the current duration-based progression for earlier levels. Avoid duplicating score submission.
6. Add behavior tests for state transitions, protection during herds, friendly giraffe launches, feasible cliff crossings, fall recovery, stage resets and finale gating. Playtest Easy/Medium/Hard with keyboard and touch.

## Acceptance checks for implementation

- Stage select and Adventure reach the savanna, and previous stages still finish normally.
- Every attack has a visible warning and a feasible dodge at the actual travel speed.
- Giraffes are always friendly and consistently launch toward a safe landing.
- Every required gap has a reachable route; pit recovery costs exactly one life.
- Sprite frames show whole characters without neighboring-frame fragments.
- Laugh and roar cues remain readable with audio muted; reduced motion suppresses shake.
- The lion cannot be skipped by waiting out the stage timer.
- The oasis never spawns enemies, has solid ground, and submits a victory score exactly once.

No gameplay code has been changed as part of this planning and artwork task.
