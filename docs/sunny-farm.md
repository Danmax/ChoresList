# Sunny Farm Helpers MVP

Open a child's Games screen and choose **Sunny Farm Helpers**. Parent → Games provides the existing enabled, age, chore gate, daily play limit, and reward settings. Defaults: ages 4–12, no household reward, no daily play cap.

## Play

Eight farm stops form one player-paced farm day. Feed the horse and cow directly with a tap; barn hay is always available. Gather field hay to stock your basket too. Feed/brush the horse, feed/milk the cow, feed chickens/collect three eggs, guide/shear sheep, feed ducks, pick apples, and plant/water/harvest carrots. Each step saves to the child's server-side `FarmProgress`; inventory and completed stops survive navigation and devices. No timer, decay, or missed-day penalty. The optional narration toggle uses the browser's speech synthesis when available; all instructions remain visible.

Once all eight stops are complete, celebrate on the map. This records one game session and awards the parent's configured points or tickets once. Starting another farm day resets task inventory while retaining completed-day count. Farm days are play rounds, not calendar dates. Existing daily play limits count completed rounds using the app's shared game-day convention.

Tap a horse, cow, chicken, or duck directly to feed it. Horse and cow targets cover the whole animal, so there is no small feeder hotspot. Barn hay covers meals when the field basket is empty; gathered hay is consumed first and never goes negative. Brushing and clipping still use tool strokes. Seeds and water pour over the garden beds; carrots pull upward, sheep guide to the right, and milking handles pull down. Eggs and apples move from their source into a stationary basket by dragging, or by tapping the item and then the basket. Dropping outside the basket leaves the item uncollected; Escape returns it to its source.

Keyboard controls: Enter feeds an animal. For collecting, Enter picks up the item and focuses the basket; Enter on the basket deposits it. For other care work, select the tool, Tab to a work spot, and press arrow keys four times. Escape puts the tool away. Touch, mouse, and pen share the same pointer controls. Partial strokes are temporary until the step finishes; completed steps save as before.

The garden uses the supplied 3×3 field background (`garden.webp`). All nine beds must be planted, watered, and harvested; crops are drawn on the actual beds. Existing saves retain completed steps and can continue across the remaining beds. No database migration is needed for this interaction update.

## Database

Apply migration `20261115000000_add_sunny_farm` using `npm run db:deploy` before opening the game against your database. Then regenerate Prisma (`npx prisma generate`) and restart/rebuild the app. The migration adds only the `FarmProgress` table with cascading household/member relations. No existing farm or game data is replaced.

The farm endpoint checks household/player access and parent game settings on every request. Actions are validated against server state. Versioned conditional updates prevent stale tabs and repeated requests from duplicating progress or rewards. Celebration and rewards share one transaction. Generic `/api/games` submissions cannot award farm rewards. Client conflicts reload the saved farm; failed requests leave the displayed farm at its last saved version.

## Assets

Project assets live in `public/games/sunny-farm/`. Seven scene images are WebP copies of the supplied landscape images. `animals.webp` and `items.webp` are transparent atlases prepared with the built-in imagegen tool, preserving the provided layout; `components/sunny-farm-art.tsx` defines rendering viewports. No runtime image-generation service or external asset URL is needed.

Image preparation prompts:

- Animals: “Remove ONLY the colored background completely, make actual transparent alpha everywhere around all characters. Preserve the 1536x1024 canvas, exact 5-row 6-column arrangement, precise locations, poses, scale, colors, details of all animals. Do not add anything. No drop shadows or ground. Each animal fully isolated on transparency.”
- Items: “Remove ALL of the colored backdrop and colored glow behind the objects. Make the entire background transparent alpha=0. Keep every object at precisely its original position, scale, shape and color. Preserve original 1536x1024 canvas and arrangement for game sprite coordinates. Transparent background, no checkerboard baked in, no shadows outside objects.”

## Verification

- `npm run test:sunny-farm`: farm-rule tests.
- `npx tsc --noEmit`: TypeScript check.
- `npx prisma validate`: schema check.
- Start a local server on port 3017, then `npm run test:sunny-farm:browser`. Override the origin with `SUNNY_FARM_TEST_URL` if needed. Browser checks use an in-memory API fixture and do not modify real households. Coverage includes all activities, save/reload, retry after failure, stale-tab recovery, celebration, next round, and mobile interaction. Screenshots are written to `/tmp/sunny-farm-preview`.

Live database migration and persistence require the target database; the isolated browser fixture verifies UI behavior and the same shared action rules without touching it.

## Interaction polish

Horse and cow activity art renders at 85% of its original width. Feeding, brushing, and milking spots share each animal’s local coordinates, keeping them aligned across screen sizes. On small screens, horse grooming reveals one spot at a time to avoid overlapping touch targets.

Tools can be selected or dragged straight from the tray. The carried tool appears on touch-down, hides when leaving the work area, and stops working on Escape, window blur, or pointer cancellation. Brush strokes can move between patches; unfinished work on other patches survives a completed step. Failed submissions clear only the submitted spot so it can be retried. Partial gestures remain local to the open activity; completed actions save to the server.

## Spaced item atlas

`items-spaced.webp` integrates the supplied “Colorful Farm Game Sticker Sheet.png” with updated viewports for every used item, including a whole apple for picking and an individual carrot plant for field growth. The tractor and trailer remain separate in the source atlas and are assembled together at render time. The older `items.webp` is retained as a source version.

The supplied checkerboard was opaque RGB. The built-in imagegen tool prepared true transparency with this prompt: “Remove ALL white/light gray checkerboard background to actual transparent alpha=0 everywhere outside the illustrated objects. Preserve the exact original canvas dimensions, object pixel positions, spacing, colors, outlines, scale and layout. Do not redraw, rearrange, add objects, or move anything.” The prepared alpha atlas is saved in `public/games/sunny-farm/items-spaced.webp`.

## Connected farm day and design research

A persistent breakfast goal links eggs from the coop, milk from the cow, and apples from the orchard. Its counts come from saved inventory, so reloads preserve the shared goal. Each goal item links to its area; a suggested next stop carries the player forward after finishing a job. All areas remain open for free exploration. The breakfast basket is a shared collection goal, not an additional household reward or a new persisted task. The full farm celebration retains the existing once-per-round reward checks.

Research used publisher-owned listings rather than unofficial game clones:

- [Hay Day, Supercell’s Google Play listing](https://play.google.com/store/apps/details?id=com.supercell.hayday) describes growing crops, feeding livestock, collecting animal products, and filling orders. Our adaptation is a small visible breakfast goal across existing areas, without real-time waiting or new currencies.
- [Toca Life: Farm, publisher listing](https://galaxystore.samsung.com/detail/com.tocaboca.tocalifefarm.samsung) describes feeding animals, milking cows, gathering eggs, and using farm produce. Our adaptation favors large direct animal interactions and tangible item movement. These implementation choices are our design interpretation, not a claim that those games use identical controls.

The feeding fix handles pointer release as well as keyboard clicks; pointer capture formerly redirected clicks away from the animal button. Browser coverage now verifies direct mouse feeding without field hay, direct touch feeding of cow/chickens/ducks, basket drops, an outside drop that does not save an egg, keyboard collection, error recovery, and the existing full round. Shared-rule tests verify the breakfast goal and hay inventory behavior. No schema migration is needed.

## Audio and scene exploration

The speaker button toggles farm sounds only. Spoken guidance is separately opt-in under **Audio settings**, with a voice chooser, preview, and volume control. Browser voices differ by device: enhanced/natural English voices are preferred where available, and the old slowed speech rate is removed. The game does not promise a studio-recorded narrator or call an external TTS provider.

Guidance speaks at most a short area welcome and one response on finishing a job; intermediate steps use varied captions and effects. Duplicate speech is suppressed, busy speech is not queued, and a manual hint/voice preview can interrupt on request. Instructions appear once in the tool tray. Repeated action responses rotate through separate feeding, collecting, growing, care, and completion phrases.

Seven short CC0 animal recordings (cow, horse, sheep, hen, duck, frog, rooster) are bundled locally alongside four original soft effects. Credits and original source/license links are in `public/games/sunny-farm/audio/CREDITS.md`. Animal files come from the trimmed, loudness-matched CC0 clips distributed by [Newel Labs](https://newellabs.com/play/animal-farm/#credits), credited to the original Freesound recordists. Playback starts only after enabling sounds, caps the volume, plays one effect at a time, and stops on mute or exit. Missing/blocked audio fails quietly so gameplay remains usable.

Each scene, including the farm map, has two optional marked surprises. Click or tap bells, a rooster, a frog, flowers, or other small props for a brief response and animation. Exploration does not send gameplay actions, consume inventory, or earn household rewards. It works with keyboard buttons and remains available after the job is done. Eating and happy animal poses reset after 1.4 seconds; the group celebration resets after 1.8 seconds. A shorn sheep stays shorn because that is the result of its completed care, not a celebration pose.

Browser checks exercise actual local audio decoding/playback, default silence, separate effects/reader controls, voice preview, varied toy replies without saved-state changes, timed pose resets, and the full existing farm loop. Speech output is instrumented during browser tests; subjective voice quality still needs listening on the intended device.
