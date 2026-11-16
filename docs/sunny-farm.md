# Sunny Farm Helpers MVP

Open a child's Games screen and choose **Sunny Farm Helpers**. Parent → Games provides the existing enabled, age, chore gate, daily play limit, and reward settings. Defaults: ages 4–12, no household reward, no daily play cap.

## Play

Eight farm stops form one player-paced farm day. Gather three hay bales before feeding the horse and cow. Feed/brush the horse, feed/milk the cow, feed chickens/collect three eggs, guide/shear sheep, feed ducks, pick apples, and plant/water/harvest carrots. Each step saves to the child's server-side `FarmProgress`; inventory and completed stops survive navigation and devices. No timer, decay, or missed-day penalty. The optional narration toggle uses the browser's speech synthesis when available; all instructions remain visible.

Once all eight stops are complete, celebrate on the map. This records one game session and awards the parent's configured points or tickets once. Starting another farm day resets task inventory while retaining completed-day count. Farm days are play rounds, not calendar dates. Existing daily play limits count completed rounds using the app's shared game-day convention.

Pick up the pictured tool from the tray before each job. Brush and clip by holding and sweeping back and forth; dust and wool fade as the work progresses. Seeds, water, and feed pour while held over a work spot. Pull carrots upward, guide sheep right toward the gate, and pull eggs, apples, and milking handles downward. Carry hay to the feeder and release, or drag the tractor to a bale. A click alone does not finish work.

Keyboard controls: select the tool, Tab to a work spot, and press arrow keys four times to perform the work. Escape puts the tool away. Touch, mouse, and pen share the same pointer controls. Partial strokes are temporary until the step finishes; completed steps save as before.

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
