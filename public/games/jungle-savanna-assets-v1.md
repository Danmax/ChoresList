# Savanna Stampede artwork and prompts

Generated using the built-in imagegen tool. Final assets are saved alongside this file in `public/games/`. Gameplay design: [`docs/jungle-savanna-level-plan.md`](../../docs/jungle-savanna-level-plan.md).

Animal PNGs are 1774 × 887 with genuine alpha transparency; each has eight poses arranged roughly in four columns and two rows. The terrain PNG is 1536 × 1024 with genuine alpha transparency; six objects are arranged roughly in three columns and two rows. The oasis is a 1774 × 887 opaque RGB background. Original alpha channels are preserved. All final files were checked with Sharp.

Generated layouts are approximate, not guaranteed uniform grids. Some pose bounds cross cell boundaries. Measure individual frames and check neighboring artwork before runtime use. The oasis is not a seamless tile. Audio and playable level code are not included.

## Lion

Asset: `jungle-savanna-lion-v1.png`

### Generation prompt

Use case: stylized-concept. Asset type: production sprite sheet for Jungle Run, a colorful side-scrolling 2D cartoon game. Style: polished hand-painted cartoon animal art, bold dark contours, warm soft cel shading, expressive faces, clean readable silhouettes, matching existing Jungle Run animal sprites. Genuinely transparent alpha background. No scenery, ground, shadow outside the sprites, text, labels, borders, grid lines, logos or watermarks. Exactly four columns by two rows of equally sized cells, eight isolated poses, generous 15 percent transparent padding around every complete character, uniform character scale and proportions across frames, limbs and tails fully inside their own cell, no overlap. All animals face LEFT in clear side view. Landscape 2:1 composition. Subject: the SAME formidable golden male lion with rich russet mane in all eight cells; fierce energetic expression and visible teeth, suitable for a children's adventure game, no blood. Row 1 left to right: stalking low; braced head raised beginning a roar; full powerful roaring mouth open; deep compressed crouch preparing to pounce. Row 2 left to right: explosive airborne extended pounce LEFT; forepaws landing with mane swinging; full low running charge LEFT; recovering standing alert. No other animals or effects.

## Giraffe

Asset: `jungle-savanna-giraffe-v1.png`

### Generation prompt

Use case: stylized-concept. Asset type: production sprite sheet for Jungle Run, a colorful side-scrolling 2D cartoon game. Style: polished hand-painted cartoon animal art, bold dark contours, warm soft cel shading, expressive faces, clean readable silhouettes, matching existing Jungle Run animal sprites. Genuinely transparent alpha background. No scenery, ground, shadow outside the sprites, text, labels, borders, grid lines, logos or watermarks. Exactly four columns by two rows of equally sized cells, eight isolated poses, generous 15 percent transparent padding around every complete character, uniform character scale and proportions across frames, limbs and tails fully inside their own cell, no overlap. All animals face LEFT in clear side view. Landscape 2:1 composition. Subject: the SAME friendly golden giraffe with chestnut patches, little ossicones, kind big eyes and a welcoming smile, full neck and all legs visible. Row 1 left to right: standing gently; walking step one; walking step two; looking down toward a rider. Row 2 left to right: bending long neck low, head facing LEFT; lowering back into a crouch to offer a ride; raising neck and body to launch a rider; cheerful upright celebration. No rider, no accessories. Keep tall shape and enough vertical space for ears and hooves.

## Wildebeest

Asset: `jungle-savanna-wildebeest-v1.png`

### Generation prompt

Use case: stylized-concept. Asset type: production sprite sheet for Jungle Run, a colorful side-scrolling 2D cartoon game. Style: polished hand-painted cartoon animal art, bold dark contours, warm soft cel shading, expressive faces, clean readable silhouettes, matching existing Jungle Run animal sprites. Genuinely transparent alpha background. No scenery, ground, shadow outside the sprites, text, labels, borders, grid lines, logos or watermarks. Exactly four columns by two rows of equally sized cells, eight isolated poses, generous 15 percent transparent padding around every complete character, uniform character scale and proportions across frames, limbs and tails fully inside their own cell, no overlap. All animals face LEFT in clear side view. Landscape 2:1 composition. Subject: the SAME stocky blue-gray wildebeest with curved dark horns, dark shaggy mane, beard and sturdy hooves; determined stampeding energy. Eight consecutive galloping cycle frames, row 1 frames 1-4, row 2 frames 5-8, legs alternate between gathering underneath, extending forward and back, pushing off and suspended gallop. Full-body side view, consistent size and ground baseline. One wildebeest per cell; the game will repeat frames for a herd. No dust clouds or motion marks obscuring hooves.

## Hyena

Asset: `jungle-savanna-hyena-v1.png`

### Generation prompt

Use case: stylized-concept. Asset type: production sprite sheet for Jungle Run, a colorful side-scrolling 2D cartoon game. Style: polished hand-painted cartoon animal art, bold dark contours, warm soft cel shading, expressive faces, clean readable silhouettes, matching existing Jungle Run animal sprites. Genuinely transparent alpha background. No scenery, ground, shadow outside the sprites, text, labels, borders, grid lines, logos or watermarks. Exactly four columns by two rows of equally sized cells, eight isolated poses, generous 15 percent transparent padding around every complete character, uniform character scale and proportions across frames, limbs and tails fully inside their own cell, no overlap. All animals face LEFT in clear side view. Landscape 2:1 composition. Subject: the SAME spotted tawny hyena with dark muzzle, rounded ears, sloping back and mischievous laughing expression. Row 1 left to right: stalking with toothy grin; head tilted up laughing mouth wide open; crouching to spring; bounding pounce LEFT. Row 2 left to right: galloping legs gathered; galloping legs extended; landing from leap; recovering with a sly laughing grin. One full-body hyena per cell; the game will repeat sprites for a pack. Menacing playful energy, no blood or wounds.

## Cliffs

Asset: `jungle-savanna-cliffs-v1.png`

### Generation prompt

Use case: stylized-concept. Asset type: modular transparent terrain atlas for Jungle Run, a colorful side-scrolling 2D cartoon game. Create a landscape sheet with exactly THREE columns and TWO rows, SIX fully isolated terrain objects on genuine transparent alpha background, plenty of clear space between objects. Polished hand-painted game art, bold dark contours, warm soft cel shading, ochre sandstone, dry golden grass and ivory weathered bones. Side-on 2D platformer view, absolutely horizontal grassy tops on the platform pieces for gameplay; rocky cliff faces extend straight down beneath. Row 1 left to right: a tall grassy LEFT cliff ledge with its sheer drop on its RIGHT side and several small old animal bones near its edge; a tall grassy RIGHT landing ledge with its sheer drop on its LEFT side; a narrow isolated flat-topped rock pillar as an intermediate stepping platform. Row 2 left to right: a mound of rounded cartoon animal skull, ribs and scattered old bones for the bottom of a ravine; a small flat crumbling sandstone platform; a grassy rocky ledge decorated with a weathered horned animal skull. Every object must be fully inside its own cell with at least 12 percent padding. These are individual reusable sprite cutouts, NOT a complete scene: no sky, no filled background, no connecting land between cells, no trees, no animals, no living characters. Dramatic adventurous Cliffs of Death, family-friendly bones with no gore, no blood, no human remains, no text, borders, logos or watermarks.

### Final edit prompt

Edit this terrain sprite atlas for Jungle Run. Remove ALL painted background, brown gradients, golden glow and backdrop behind and between the six rock objects, output genuine transparent alpha, not a solid color and not checkerboard. Preserve the six illustrated objects exactly: two tall grassy bone-strewn cliff ledges, narrow rock pillar, skull-and-rib bone mound, small crumbling stone platform, grassy skull ledge. Keep all bones, grass, stone details and colors. Reposition and shrink the six cutouts to a strict THREE columns by TWO rows of equally sized cells with 15 percent fully transparent padding on every side, entirely separated, no edge touching or clipping. No shadows outside cutouts, no scenery, no text, no borders. Do not add objects. Family-friendly cartoon terrain art.

The initial terrain generation included a painted background. The selected final edit has a transparent alpha channel, verified from pixel data.

## Oasis

Asset: `jungle-savanna-oasis-v1.png`

### Generation prompt

Use case: stylized-concept. Asset type: wide side-scrolling 2D background concept for Jungle Run's Oasis of Victory finish area. Create ONE panoramic cartoon game scene, landscape 2:1 composition. Polished hand-painted art, bold readable outlines, warm soft cel shading matching colorful Jungle Run cartoon animal sprites. African savanna at late afternoon, golden grasses and sparse flat-topped acacia trees, warm peach and amber sky, distant hazy savanna hills. A lush inviting oasis in the middle-right distance with turquoise clear water, reeds, palms, grassy shore and flowers. Warm rays of sunshine make it feel triumphant and peaceful after a hard adventure. Leave the bottom 20 percent as a simple continuous horizontal dry sandy golden path for the runner, dry solid ground along its ENTIRE width with no water or gaps on the playable path. The water is behind the playable ground, never across it. Keep the lower middle of the image visually uncluttered so the player is readable. Include a natural leafy arch by the oasis suggesting a finish destination, with no lettering or trophy. The game adds all characters and UI separately. No animals, people, text, lettering, logo, watermark, frames or UI. Solid opaque illustrated background, not transparent.


