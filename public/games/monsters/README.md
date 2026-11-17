# Moonlit Monster Hollow assets

Imported from the 27 PNGs supplied for the monster level. Original downloads are
untouched. Runtime files use lossless WebP for sprites and quality-88 WebP for
the three panoramas; the collection is approximately 6.3 MB.

Each atlas has four 256px columns. Characters and effects have two rows; props
have three rows, and the isolated pumpkin has one. Every occupied cell has at
least **40 fully transparent pixels on all four sides**, including faint glow.
This is 15.625% per side, equivalent to 80px on a 512px cell. Grounded art uses
source baseline y=216. Character scale is shared across both animation sheets.

The source tileset contains nine objects in unequal columns, so its frames are
extracted individually. The importer removes exterior pale mattes from the
werewolf encounter, zombie encounter, vampire movement, and rune sheets. Effect
crop perimeters taper to transparent before being packed into the safe area.

To reproduce the import from a folder containing the original filenames:

```sh
node scripts/import-monster-assets.mjs /path/to/original/downloads
node --import tsx --test tests/jungle-monster-assets.test.ts
```

`import-manifest.json` records source names, dimensions, matte cleanup, and atlas
layout. The game requests these images when entering the savanna or selecting
Monster Hollow, allowing Adventure Mode to preload the next stage. Panoramas
repeat with alternating reflection, joining matching source edges.
