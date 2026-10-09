# Treasure Trail

Play inside the Pal's current room. The Pal follows the player through a short
trail of visual clues, ending with a treasure chest and a shared celebration.

## First version

1. Choose Treasure Trail from Play. The Pal presents a clue such as “Find something green that grows.”
2. The student taps the plant in the room. The Pal walks over and reveals a key.
3. The next clues lead to unique room objects, then the chest. Students under
   six get two discoveries and picture clues; older students get three.
   Each discovery fills a visible trail; wrong guesses receive a hint with no penalty.
4. The chest opens, the Pal plays its celebration pose, and a completed trail
   earns 8 coins under the shared three-play-wins daily cap.

Use the actual room objects as clickable targets. Every room must have at least
three guaranteed objects, independent of shop purchases. Owned decorations can
add optional targets, but never become a requirement or make a clue ambiguous.
Clues name a unique visible feature; do not ask about an object absent from the
current room. Younger students get picture clues and shorter trails; older
students get directional and two-step clues. Allow replaying the current clue.

## Implementation

- Scene objects have stable IDs and room-relative positions; share this catalog
  between room rendering and server trail generation. Avoid invisible hotspots.
- The round freezes its object catalog. Buying more décor adds targets only to
  the next trail. Buying or moving to another room clears the current trail.
- The server creates the trail and advances one correct object at a time;
  only the current clue and progress are published. Challenge ID, step, and
  optimistic version checks reject forged, skipped, stale, or replayed actions.
- Progress persists so reloading resumes the current clue. No timer or speed
  bonus; the household's new day resets unfinished trails along with other games.
- Keep clues and progress below the room, clear of the speech and mood labels.
- Provide keyboard-focusable objects, descriptive labels, large touch targets,
  and reduced-motion transitions.

## Acceptance checks

Complete a trail in each room with no purchased décor and with all décor owned.
Check unique clue targets, retries, reloads, room changes, server reward cap and
replay protection, and layouts at 320px and desktop widths.

Status: implemented and available from the game picker.

## Artwork and code

- `lib/pocket-pals-treasure.ts`: shared object positions, labels, and clues.
- `lib/pocket-pals.ts`: server-issued trails, progress, and shared rewards.
- `components/pocket-pals-treasure.tsx`: targets, hint controls, keys, and chest.
- `public/games/pocket-pals/treasure-props-v1.png`: plant, blue book, teddy sheet.
- `public/games/pocket-pals/treasure-chest-v1.png`: closed/open chest sheet.
- `public/games/pocket-pals/treasure-key-v1.png`: golden paw key.
- `public/games/pocket-pals/treasure-asset-prompts.md`: final generation prompts.
