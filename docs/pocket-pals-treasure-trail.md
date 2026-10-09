# Treasure Trail — proposed next game

Play inside the Pal's current room. The Pal follows the player through a short
trail of visual clues, ending with a treasure chest and a shared celebration.

## First version

1. The Pal presents a clue: “Find something green that grows.”
2. The student taps the plant in the room. The Pal walks over and reveals a key.
3. Two more clues lead to a room object, then the chest. Each found item fills
   a visible three-part trail; wrong guesses receive a hint with no penalty.
4. The chest opens, the Pal plays its celebration pose, and a completed trail
   earns 8 coins under the shared three-play-wins daily cap.

Use the actual room objects as clickable targets. Every room must have at least
three guaranteed objects, independent of shop purchases. Owned decorations can
add optional targets, but never become a requirement or make a clue ambiguous.
Clues name a unique visible feature; do not ask about an object absent from the
current room. Younger students get picture clues and shorter trails; older
students get directional and two-step clues. Allow replaying the current clue.

## Implementation

- Give scene objects stable IDs and room-relative positions; share this catalog
  between room rendering and server trail generation. Avoid invisible hotspots.
- Freeze the object catalog for a round, or restart when the room changes.
- Server creates the trail and advances it one correct object at a time; publish
  only the current clue and progress. Reject stale, expired, or replayed actions.
- Persist progress so reloading resumes the current clue. No timer or speed bonus.
- Keep clues and progress below the room, clear of the speech and mood labels.
- Provide keyboard-focusable objects, descriptive labels, large touch targets,
  and reduced-motion transitions.

## Acceptance checks

Complete a trail in each room with no purchased décor and with all décor owned.
Check unique clue targets, retries, reloads, room changes, server reward cap and
replay protection, and layouts at 320px and desktop widths.

Status: planning only; Treasure Trail is not yet in the game picker.
