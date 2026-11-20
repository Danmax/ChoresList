# Sunny Farm Helpers MVP

Open a child's Games screen and choose **Sunny Farm Helpers**. Parent → Games provides the existing enabled, age, chore gate, daily play limit, and reward settings. Defaults: ages 4–12, no household reward, no daily play cap.

## Play

Games open in a viewport-sized player on phones and tablets. **Full screen** also works on desktop, with a browser fullscreen request when supported and an in-page fallback otherwise. **Exit full screen** or Escape restores the page without restarting the game. The farm map, activity scene, tools, crop choices, and scene navigation fit the available height in portrait and landscape. **Your farm basket & breakfast trail** opens the inventory and breakfast shortcuts above the scene; close it to resume play. Scene headings receive keyboard focus without moving the page.

Run `npm run test:games:responsive` against a local server on port 3017 (or set `GAMES_TEST_URL`) to check all 13 games at phone and tablet sizes, farm scene transitions and completion controls, Block Drop controls, and fullscreen state preservation.

Eight farm stops form one player-paced farm day. Feed the horse and cow directly with a tap; barn hay is always available. Mow the hayfield with a tractor, then deliver its bundles by pickup truck to stock your basket too. Feed/brush the horse, feed/milk the cow, feed chickens/collect eggs from six stalls, guide/shear sheep, feed ducks, pick apples, and hoe/plant/water/harvest nine plots of wheat, vegetables, and fruit. Each step saves to the child's server-side `FarmProgress`; inventory and completed stops survive navigation and devices. Crops have short growth timers; there is no decay or missed-day penalty. The optional narration toggle uses the browser's speech synthesis when available; all instructions remain visible.

Once all eight stops are complete, celebrate on the map. This records one game session and awards the parent's configured points or tickets once. Starting another farm day resets task inventory while retaining completed-day count. Farm days are play rounds, not calendar dates. Existing daily play limits count completed rounds using the app's shared game-day convention.

Tap a horse, cow, chicken, or duck directly to feed it. Horse and cow targets cover the whole animal, so there is no small feeder hotspot. Barn hay covers meals when the field basket is empty; gathered hay is consumed first and never goes negative. Brushing and clipping still use tool strokes. Seeds and water pour over the garden beds; ripe vegetables pull upward, sheep guide to the right, and cow milking uses a direct hold or four taps per squeeze. Eggs and apples move from their source into a stationary basket by dragging, or by tapping the item and then the basket. Dropping outside the basket leaves the item uncollected; Escape returns it to its source.

Keyboard controls: Enter feeds an animal. For collecting, Enter picks up the item and focuses the basket; Enter on the basket deposits it. For other care work, select the tool, Tab to a work spot, and press arrow keys four times. Escape puts the tool away. Touch, mouse, and pen share the same pointer controls. Partial strokes are temporary until the step finishes; completed steps save as before.

The garden uses the supplied 3×3 field background (`garden.webp`). Each plot can be hoed, planted, watered, and harvested independently. All nine plots must be harvested to finish the garden; crops, growth stages, and countdowns are drawn on the actual beds. Existing saves retain completed steps and can continue across the remaining beds. Previously watered plots without timestamps remain ready to harvest. No database migration is needed for this interaction update.

## Database

Apply migration `20261115000000_add_sunny_farm` using `npm run db:deploy` before opening the game against your database. Then regenerate Prisma (`npx prisma generate`) and restart/rebuild the app. The migration adds only the `FarmProgress` table with cascading household/member relations. No existing farm or game data is replaced.

The farm endpoint checks household/player access and parent game settings on every request. Actions are validated against server state. Versioned conditional updates prevent stale tabs and repeated requests from duplicating progress or rewards. Celebration and rewards share one transaction. Generic `/api/games` submissions cannot award farm rewards. Client conflicts reload the saved farm; failed requests leave the displayed farm at its last saved version.

## Assets

Project assets live in `public/games/sunny-farm/`. Seven scene images are WebP copies of the supplied landscape images. `animals.webp` and `items.webp` are transparent atlases prepared with the built-in imagegen tool, preserving the provided layout; `components/sunny-farm-art.tsx` defines rendering viewports. No runtime image-generation service or external asset URL is needed.

Image preparation prompts:

- Animals: “Remove ONLY the colored background completely, make actual transparent alpha everywhere around all characters. Preserve the 1536x1024 canvas, exact 5-row 6-column arrangement, precise locations, poses, scale, colors, details of all animals. Do not add anything. No drop shadows or ground. Each animal fully isolated on transparency.”
- Items: “Remove ALL of the colored backdrop and colored glow behind the objects. Make the entire background transparent alpha=0. Keep every object at precisely its original position, scale, shape and color. Preserve original 1536x1024 canvas and arrangement for game sprite coordinates. Transparent background, no checkerboard baked in, no shadows outside objects.”

## Verification

- `npm run test:sunny-farm`: farm and Hayfield driving rule tests.
- `npm run test:sunny-farm:driving`: focused driving, touch, persistence, and responsive browser checks (local server on port 3017).
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

- [Hay Day, Supercell’s Google Play listing](https://play.google.com/store/apps/details?id=com.supercell.hayday) describes growing crops, feeding livestock, collecting animal products, and filling orders. Our adaptation is a small visible breakfast goal across existing areas, alongside short crop timers and without new currencies.
- [Toca Life: Farm, publisher listing](https://galaxystore.samsung.com/detail/com.tocaboca.tocalifefarm.samsung) describes feeding animals, milking cows, gathering eggs, and using farm produce. Our adaptation favors large direct animal interactions and tangible item movement. These implementation choices are our design interpretation, not a claim that those games use identical controls.

The feeding fix handles pointer release as well as keyboard clicks; pointer capture formerly redirected clicks away from the animal button. Browser coverage now verifies direct mouse feeding without field hay, direct touch feeding of cow/chickens/ducks, basket drops, an outside drop that does not save an egg, keyboard collection, error recovery, and the existing full round. Shared-rule tests verify the breakfast goal and hay inventory behavior. No schema migration is needed.

## Audio and scene exploration

The speaker button toggles farm sounds only. Spoken guidance is separately opt-in under **Audio settings**, with a voice chooser, preview, and volume control. Browser voices differ by device: enhanced/natural English voices are preferred where available, and the old slowed speech rate is removed. The game does not promise a studio-recorded narrator or call an external TTS provider.

Guidance speaks at most a short area welcome and one response on finishing a job; intermediate steps use varied captions and effects. Duplicate speech is suppressed, busy speech is not queued, and a manual hint/voice preview can interrupt on request. Instructions appear once in the tool tray. Repeated action responses rotate through separate feeding, collecting, growing, care, and completion phrases.

Seven short CC0 animal recordings (cow, horse, sheep, hen, duck, frog, rooster) are bundled locally alongside four original soft effects. Credits and original source/license links are in `public/games/sunny-farm/audio/CREDITS.md`. Animal files come from the trimmed, loudness-matched CC0 clips distributed by [Newel Labs](https://newellabs.com/play/animal-farm/#credits), credited to the original Freesound recordists. Playback starts only after enabling sounds, caps the volume, plays one effect at a time, and stops on mute or exit. Missing/blocked audio fails quietly so gameplay remains usable.

Each scene, including the farm map, has two optional marked surprises. Click or tap bells, a rooster, a frog, flowers, or other small props for a brief response and animation. Exploration does not send gameplay actions, consume inventory, or earn household rewards. It works with keyboard buttons and remains available after the job is done. Eating and happy animal poses reset after 1.4 seconds; the group celebration resets after 1.8 seconds. A shorn sheep stays shorn because that is the result of its completed care, not a celebration pose.

Browser checks exercise actual local audio decoding/playback, default silence, separate effects/reader controls, voice preview, varied toy replies without saved-state changes, timed pose resets, and the full existing farm loop. Speech output is instrumented during browser tests; subjective voice quality still needs listening on the intended device.


## Garden plots, tools, and harvest times

Choose a garden tool, then work on any matching plot. The **Garden hoe** prepares empty soil with strokes. **Planting seeds** pours the selected seed into a prepared plot. The **Watering can** starts that plot’s growth timer. The **Harvest sickle** collects a ripe crop with an upward pull. Keyboard players select a tool, focus a matching plot, and press an arrow key four times. A tool cannot work on an incompatible plot. Seed choices stay available in a horizontally scrolling tray on smaller screens.

Each of the nine plots grows independently, so you can water the first plot while the other eight are empty. The garden summary shows growing, ready, and harvested counts; the map also shows crops ready to harvest. Sprouts develop into recognizable plants and ripe crops. Seeds and tools are free. One harvest per plot contributes one item to the basket; another farm day starts a fresh crop patch.

| Crop | Type | Time after watering |
| --- | --- | --- |
| Wheat | Grain | 30 seconds |
| Carrots | Vegetable | 45 seconds |
| Tomatoes | Vegetable | 1 minute |
| Corn | Vegetable | 1 minute 30 seconds |
| Strawberries | Fruit | 1 minute 15 seconds |
| Potatoes | Vegetable | 1 minute |
| Blueberries | Fruit | 1 minute 45 seconds |
| Pumpkins | Vegetable | 2 minutes |
| Watermelons | Fruit | 2 minutes 30 seconds |

Watering timestamps and crop IDs save in the existing JSON farm state. Timers continue while visiting animals, navigating away, or closing the game. The client follows the server clock and refreshes its display every second; the server independently rejects early harvests. Ripe crops stay ready indefinitely. A waiting garden never counts as completed, and harvesting the same plot twice is rejected.

No database migration is required. Older crops retain their variety (or carrots where no variety was recorded), older watered plots are immediately ripe, and older harvested plots remain completed. Starting another farm day clears plot choices, timers, and inventory. New crop and tool illustrations are inline SVG and require no external artwork or network calls.

Rule tests cover every crop’s exact timer boundary, independent plot actions, JSON save/reload, old saves, duplicate harvests, and round resets. Browser coverage plants all nine varieties, verifies saved growing plots after reload, advances the fixture clock to readiness, and harvests each variety into its own basket count. Browser fixtures use no live household data.

## Hayfield tractor and pickup truck

The Hayfield opens a top-down driving game in the same farm stop. First drive the tractor and attached mower over **100%** of the 216 golden field patches. The mower cuts a three-cell-wide swath; revisiting cut ground never increases coverage. Each of nine sections forms a hay bundle when all its patches are cut. An exact coverage meter prevents a small missed patch from being counted as finished.

At 100%, **Drive pickup truck** switches to the separate blue truck parked beside the field. Drive over bundles to load them automatically. The truck carries three bundles at a time; drive to the marked **Barn bay** to unload before collecting more. The barn receives one hay inventory item per delivered bundle. All nine deliveries finish the stop. Mowing or picking up hay alone does not award inventory or finish the job. This still counts as one of the existing eight farm stops; the farm-day reward remains unchanged.

Controls: Arrow keys or WASD drive in world directions. Hold the on-screen direction buttons for touch, mouse, or pen steering, or tap/drag a destination in the field to drive there. Release a direction to stop; pause parks the vehicle. Window blur, scene navigation, and pointer cancellation release held steering. No time limit, fuel, damage, or missed-day penalty is added.

Driving saves in small serialized input batches. The browser replays pending moves over each acknowledgement so steering remains responsive during a save. Scene navigation flushes queued moves before leaving. Coverage, vehicle, position, loaded bundles, and delivered bundles persist in the existing farm JSON. After a failed save, **Retry save** resubmits pending moves. A version conflict or a lost response that already saved resets to the confirmed server state to avoid duplicate delivery credit.

No schema migration or new image assets are required. The map, tractor, mower, truck, and bundles use scalable SVG artwork. Existing completed Hayfield saves stay completed; each previously collected legacy bale credits one third of the hauling job without re-awarding its existing inventory. New farm days start with an unmowed field and an empty truck.

The shared engine tests cover unique coverage, the last missed patch, bundle formation, truck capacity, the loading bay, malformed commands, boundaries, inventory credit, round completion, and legacy saves. The full farm browser playthrough drives the tractor and truck through all nine deliveries. The focused driving browser checks continuous keyboard and touch controls, tap-to-drive coordinates, pausing, saved exits, reloads, lost responses, resumed truck cargo, and portrait/landscape phone layouts. All browser checks use isolated in-memory household fixtures.


## Horse treats, milking, and nesting stalls

Horse brushing spots follow the tail, body, and mane. Harvested apples and carrots can be shared with the horse using the treat buttons; each successful save consumes exactly one item. A treat can satisfy the initial feeding step, and treats remain available after grooming. Hay remains available as before.

The cow’s bucket sits on the left. Hold the spot under the udder to milk, or tap it four times per squeeze; Enter, Space, and arrow keys also work. Three saved squeezes fill the bucket and add one milk. No tool pickup is needed.

Chickens wander and peck, pausing for feeding or focused controls. Feeding scatters small grains over the ground. Each of the six stalls receives 0–3 eggs when a new farm day starts. Counts save with the round and do not reroll on reload. Empty stalls need no collection; the egg breakfast goal adjusts when fewer than three eggs are available. Old saves retain their three original eggs and collection IDs. On phones, a stall presents one large egg target at a time and shows how many remain. Reduced-motion settings disable the wandering and falling animations.

Farm rule and browser checks cover harvested treats and failed saves, direct mouse/touch milking, mixed and empty stalls, saved egg counts, and collection without duplicates. No database migration is required.
