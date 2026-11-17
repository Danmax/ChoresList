import assert from 'node:assert/strict';
import { chromium, expect, type Browser } from '@playwright/test';
import { LEVELS } from '../lib/jungle-runner';

async function checkStageMenu(browser: Browser) {
  for (const viewport of [
    { width: 1366, height: 768 },
    { width: 1024, height: 700 },
    { width: 390, height: 844 },
    { width: 320, height: 568 },
    { width: 844, height: 390 },
    { width: 667, height: 375 },
  ]) {
    const page = await browser.newPage({ viewport });
    try {
      await page.goto(`${process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3000'}/play/jungle`);
      await page.getByRole('button', { name: 'Play free demo' }).click();
      const root = page.locator('section[data-game-screen="false"]');
      await root.evaluate(element => { element.scrollTop = 0; });
      const mode = page.getByRole('button', { name: 'Select a Stage' });
      await expect(mode).toBeInViewport({ ratio: 1 });
      await mode.click();
      await root.evaluate(element => { element.scrollTop = 0; });
      await expect(mode).toBeInViewport({ ratio: 1 });
      await expect(page.getByRole('button', { name: /1\. Banana Grove/ })).toBeInViewport({ ratio: 1 });
      await expect(page.getByRole('button', { name: /^\d+\./ })).toHaveCount(LEVELS.length);
      for (const [index, level] of LEVELS.entries()) {
        const button = page.getByRole('button', { name: `${index + 1}. ${level.name}`, exact: index < 6 });
        await button.scrollIntoViewIfNeeded();
        await expect(button).toBeInViewport({ ratio: 1 });
        await button.click();
        await expect(button).toHaveAttribute('aria-pressed', 'true');
      }
      const play = page.getByRole('button', { name: 'Play Moonlit Monster Hollow', exact: true });
      await play.scrollIntoViewIfNeeded();
      await expect(play).toBeInViewport({ ratio: 1 });
      if (viewport.width === 390 || viewport.width === 1024 || viewport.width === 844) {
        await page.screenshot({ path: `/tmp/jungle-stage-menu-${viewport.width}.png`, fullPage: true });
      }
      await play.click();
      await expect(page.locator('section[data-playing="true"]')).toBeVisible();
      await expect(page.locator('p').filter({ hasText: /Level 9\/9/ })).toContainText('Moonlit Monster Hollow');
    } finally {
      await page.close();
    }
  }
}

async function main() {
 const browser = await chromium.launch({ headless: true });
 try {
  await checkStageMenu(browser);
  const page = await browser.newPage({ viewport: { width: 1200, height: 1050 } });
  const errors: string[] = [], failedAssets: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.url().includes('/games/monsters/') && !response.ok()) failedAssets.push(response.url()); });
  await page.goto(`${process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3000'}/play/jungle`);
  await page.getByRole('button', { name: 'Play free demo' }).click();
  await page.getByRole('button', { name: 'Select a Stage' }).click();
  await page.getByRole('button', { name: /9\. Moonlit Monster Hollow/ }).click();
  await expect(page.getByRole('button', { name: 'Play Moonlit Monster Hollow', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Play Moonlit Monster Hollow', exact: true }).click();
  await expect(page.locator('section[data-playing="true"]')).toBeVisible();
  await page.waitForFunction(() => performance.getEntriesByType('resource').filter(entry => entry.name.includes('/games/monsters/')).length >= 28);
  await page.keyboard.press('KeyJ');
  await expect(page.locator('p').filter({ hasText: /Level 9\/9.*PUNCH/ })).toBeVisible();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Taking a breather' })).toBeVisible();
  await page.getByRole('button', { name: 'Resume', exact: true }).first().click();
  await expect(page.locator('section[data-paused="false"]')).toBeVisible();
  await page.screenshot({ path: '/tmp/monster-hollow-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: /^JUMP/ }).last()).toBeVisible();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  await page.screenshot({ path: '/tmp/monster-hollow-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('[aria-label="Landscape gamepad controls"]')).toBeVisible();
  await page.screenshot({ path: '/tmp/monster-hollow-landscape.png', fullPage: true });
  assert.deepEqual(failedAssets, []);
  assert.deepEqual(errors, []);
  console.log('Monster Hollow browser checks passed: every stage reachable and stage nine playable at six viewport sizes, assets, keyboard combat, pause/resume, portrait and landscape controls.');
 } finally {
  await browser.close();
 }
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
