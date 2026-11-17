import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';

async function main() {
 const browser = await chromium.launch({ headless: true });
 try {
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
  console.log('Monster Hollow browser checks passed: selection, assets, keyboard combat, pause/resume, portrait and landscape controls.');
 } finally {
  await browser.close();
 }
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
