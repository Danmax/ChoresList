import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

test('every imported monster, prop, and magic frame has 40px of genuinely transparent padding', async () => {
  const root = path.resolve('public/games/monsters');
  const manifest = JSON.parse(await readFile(path.join(root, 'import-manifest.json'), 'utf8')) as {
    atlases: Record<string, { frames: number; rows: number }>;
    sources: Record<string, { exteriorMatteRemoved: boolean }>;
  };
  for (const [key, atlas] of Object.entries(manifest.atlases)) {
    const { data, info } = await sharp(path.join(root, `${key}.webp`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(info.width, 1024, key); assert.equal(info.height, atlas.rows * 256, key);
    for (let frame = 0; frame < atlas.frames; frame++) {
      let visible = 0;
      for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
        const alpha: number = data[((Math.floor(frame / 4) * 256 + y) * info.width + frame % 4 * 256 + x) * 4 + 3];
        if (x < 40 || x >= 216 || y < 40 || y >= 216) assert.equal(alpha, 0, `${key} frame ${frame}: unsafe pixel at ${x},${y}`);
        else if (alpha) visible++;
      }
      assert.ok(visible > 20, `${key} frame ${frame} has visible art`);
    }
  }
  assert.equal(Object.values(manifest.sources).filter(source => source.exteriorMatteRemoved).length, 0);
  for (const name of [
    'Werewolf Action Pose Sprite Sheet',
    'Eight Purple Moon Magic Circles Sprite Sheet',
    'Eight Poses of a Cartoon Zombie Worker',
    'Chibi Vampire Running Sprite Sheet',
  ]) assert.equal(manifest.sources[name]?.exteriorMatteRemoved, false, `${name} uses its supplied transparency`);
});
