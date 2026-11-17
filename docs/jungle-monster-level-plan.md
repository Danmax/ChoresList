# Moonlit Monster Hollow

The ninth Jungle Run stage is available directly through Select a Stage and
follows the savanna oasis in Adventure Mode. It uses the existing controls and
difficulty settings. Its collectible is Amethyst.

The route moves through haunted woodland, a moonlit graveyard, and a troll
bridge before reaching the castle courtyard. Seven authored encounters cycle
through wolves, goblins, zombies, werewolves, forest beasts, trolls, and vampires.
Warnings and windups precede attacks; recovery poses provide counter openings.
Ordinary enemies can be defeated or bypassed. Bananas and occasional hearts
follow encounters.

- Wolves and werewolves leap; zombies lunge along the ground.
- Goblins throw arcing pumpkin bombs; vampires cast purple bolts.
- Trolls and beasts mark a fixed ground location with a warning rune before an
  emerald eruption. Jump clear of the marked location.
- Punch, kick, dash, or dive into a projectile to return it for two damage.
- Moon shields absorb one hit and expire after nine seconds of active play.
- The Headless Horseman arrives at 80% of the stage timer and alternates charges
  with pumpkin throws. Double jump over charges, slide beneath throws, and
  counter during recovery. Boss health is 4/5/6 on Easy/Medium/Hard.

The timer stops at the end of the stage until the Horseman is defeated. Breaking
the curse clears hostile spells and opens the castle portal; crossing it on the
ground wins. The savanna retains its own oasis victory in single-stage mode,
while Adventure Mode proceeds into Monster Hollow after reaching the oasis.

Animation, gameplay, and transparent gutters are covered by the Jungle tests.
The browser check covers stage selection, asset loading, keyboard combat,
pause/resume, and portrait and landscape controls:

```sh
npm run test:jungle
npm run dev -- --webpack
npm run test:jungle:browser
```
