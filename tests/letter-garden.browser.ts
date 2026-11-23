import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, expect, type Page } from "@playwright/test";
import { letterStrokes, lessonFor, type LetterCase, type TracePoint } from "../lib/letter-garden";
import { DEFAULT_GAME_SETTINGS, GAME_DEFINITIONS } from "../lib/games";

declare global { interface Window { letterMedia: HTMLMediaElement[] } }
const baseUrl = process.env.LETTERS_TEST_URL ?? "http://127.0.0.1:3017";
const screenshots = "/tmp/letter-garden-preview";

async function onPaper(page: Page, points: TracePoint[]) {
  return page.getByRole("application").evaluate((node, points) => {
    const matrix = (node as unknown as SVGSVGElement).getScreenCTM()!;
    return points.map(point => { const screen = new DOMPoint(point.x, point.y).matrixTransform(matrix); return { x: screen.x, y: screen.y }; });
  }, points);
}

async function traceLetter(page: Page, letter: string, letterCase: LetterCase, touch = false) {
  const paper = page.getByRole("application");
  const cdp = touch ? await page.context().newCDPSession(page) : null;
  try {
    for (const [index, stroke] of letterStrokes(lessonFor(letter), letterCase).entries()) {
      await paper.scrollIntoViewIfNeeded();
      const sampled = stroke.points.filter((_, i) => i % 2 === 0 || i === stroke.points.length - 1);
      const points = await onPaper(page, sampled);
      if (cdp) await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...points[0], id: 1 }] });
      else { await page.mouse.move(points[0].x, points[0].y); await page.mouse.down(); }
      for (const point of points.slice(1)) {
        if (cdp) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...point, id: 1 }] });
        else await page.mouse.move(point.x, point.y);
      }
      if (cdp) await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      else await page.mouse.up();
      await expect(page.getByRole("region", { name: "Letter Garden", exact: true })).toHaveAttribute("data-stroke", String(index + 1));
    }
  } finally { await cdp?.detach(); }
}

async function main() {
  await mkdir(screenshots, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, hasTouch: true, reducedMotion: "reduce" });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(() => {
      window.letterMedia = [];
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () { window.letterMedia.push(this); return play.call(this); };
    });
    assert.equal((await page.goto(`${baseUrl}/play/letters`))?.status(), 200);
    const game = page.getByRole("region", { name: "Letter Garden", exact: true });
    const paper = page.getByRole("application");
    await expect(page.getByRole("heading", { name: "A is for Apple", exact: true })).toBeVisible();
    await expect(page.getByRole("img", { name: "Apple", exact: true })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `${screenshots}/garden-desktop.png`, fullPage: true });
    await page.getByRole("button", { name: "Hear the letter", exact: true }).click();
    await expect.poll(() => page.evaluate(() => window.letterMedia.some(player => player.src.includes("/voices/warm/")))).toBe(true);

    await page.clock.install();
    await page.getByRole("button", { name: "Watch letter demo", exact: true }).click();
    await expect(page.getByRole("button", { name: "Stop letter demo", exact: true })).toBeVisible();
    await page.clock.fastForward(30_000);
    await expect(page.getByRole("button", { name: "Watch letter demo", exact: true })).toBeVisible();
    await expect(game).toHaveAttribute("data-stroke", "0");
    await expect(game).toHaveAttribute("data-complete", "false");
    const wrong = (await onPaper(page, [{ x: 330, y: 30 }]))[0];
    await page.mouse.click(wrong.x, wrong.y);
    await expect(game).toHaveAttribute("data-stroke", "0");
    await expect(game.getByRole("status")).toContainText("glowing dot");

    await traceLetter(page, "A", "uppercase");
    await expect(game).toHaveAttribute("data-complete", "true");
    await expect(page.getByText("1 of 52 letters grown", { exact: true })).toBeVisible();
    await page.screenshot({ path: `${screenshots}/letter-a-complete.png`, fullPage: true });
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await expect(game).toHaveAttribute("data-stroke", "0");
    await expect(page.getByText("1 of 52 letters grown", { exact: true })).toBeVisible();

    // Resume a stroke after lifting early.
    await paper.scrollIntoViewIfNeeded();
    const stroke = letterStrokes(lessonFor("A"), "uppercase")[0];
    const middle = Math.floor(stroke.points.length / 2);
    const partial = await onPaper(page, [stroke.points[0], stroke.points[middle]]);
    await page.mouse.move(partial[0].x, partial[0].y); await page.mouse.down(); await page.mouse.move(partial[1].x, partial[1].y, { steps: 20 }); await page.mouse.up();
    await expect(game).toHaveAttribute("data-stroke", "0");
    await expect(game.getByRole("status")).toContainText("Pick up");
    const resume = await onPaper(page, [stroke.points[middle], stroke.points[stroke.points.length - 1]]);
    await page.mouse.move(resume[0].x, resume[0].y); await page.mouse.down(); await page.mouse.move(resume[1].x, resume[1].y, { steps: 20 }); await page.mouse.up();
    await expect(game).toHaveAttribute("data-stroke", "1");

    await page.getByRole("button", { name: "Practice uppercase O, Orange", exact: true }).click();
    await paper.scrollIntoViewIfNeeded();
    const ovalStart = (await onPaper(page, [letterStrokes(lessonFor("O"), "uppercase")[0].points[0]]))[0];
    await page.mouse.click(ovalStart.x, ovalStart.y);
    await expect(game).toHaveAttribute("data-complete", "false");
    await traceLetter(page, "O", "uppercase");
    await expect(game).toHaveAttribute("data-complete", "true");

    await page.getByRole("button", { name: /^abc Lowercase$/ }).click();
    await page.getByRole("button", { name: "Practice lowercase I, Ice cream", exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await traceLetter(page, "I", "lowercase", true);
    await expect(game).toHaveAttribute("data-complete", "true");
    await page.screenshot({ path: `${screenshots}/lowercase-i-touch.png`, fullPage: true });
    await page.getByRole("button", { name: "Practice lowercase L, Leaf", exact: true }).click();
    await paper.scrollIntoViewIfNeeded();
    await paper.focus(); await paper.press("Enter");
    for (let index = 0; index < 29; index++) await paper.press("ArrowDown");
    await paper.press("Enter");
    await expect(game).toHaveAttribute("data-complete", "true");

    await page.getByRole("button", { name: "Practice lowercase B, Butterfly", exact: true }).click();
    await page.getByRole("button", { name: "Try without the dotted trail", exact: true }).click();
    await expect(page.getByRole("button", { name: "Bring back the dotted trail", exact: true })).toHaveAttribute("aria-pressed", "true");
    assert.equal(await paper.locator('path[class*="trailDots"]').count(), 0);
    await traceLetter(page, "B", "lowercase", true);
    await expect(game).toHaveAttribute("data-complete", "true");
    await page.reload();
    await expect(game).toHaveAttribute("data-letter", "B");
    await expect(game).toHaveAttribute("data-letter-case", "lowercase");
    await expect(page.getByText("5 of 52 letters grown", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Bring back the dotted trail", exact: true })).toBeVisible();

    for (const size of [{ width: 320, height: 568 }, { width: 844, height: 390 }, { width: 768, height: 1024 }, { width: 1440, height: 1000 }]) {
      await page.setViewportSize(size);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `no horizontal overflow at ${size.width}`);
      const key = (await page.getByRole("button", { name: "Practice lowercase A, Apple", exact: true }).boundingBox())!;
      assert.ok(key.width >= 44 && key.height >= 44, `alphabet touch targets at ${size.width}: ${JSON.stringify(key)}`);
      await page.screenshot({ path: `${screenshots}/garden-${size.width}.png`, fullPage: true });
    }

    // Launch through the existing games library and exercise session save retry.
    const member = { id: "letters-preview", name: "Alex", age: 5, avatar: "🧒", color: "#a78bfa", totalPoints: 0 };
    const sessions: Record<string, unknown>[] = [];
    let failSave = true;
    await page.route("**/api/**", async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.pathname === "/api/games" && request.method() === "POST") {
        if (failSave) { failSave = false; return route.fulfill({ status: 503, json: { error: "Unavailable" } }); }
        sessions.push(request.postDataJSON());
        return route.fulfill({ status: 201, json: { reward: { type: "none", points: 0, tickets: 0 } } });
      }
      return route.fulfill({ json: url.pathname === "/api/games" ? {
        member, members: [member], games: GAME_DEFINITIONS, chessPlayers: [],
        settings: GAME_DEFINITIONS.map(game => ({ gameKey: game.key, ...DEFAULT_GAME_SETTINGS[game.key] })),
        availability: Object.fromEntries(GAME_DEFINITIONS.map(game => [game.key, { available: true }])),
      } : { matches: [], posts: [] } });
    });
    await page.goto(`${baseUrl}/kid/${member.id}/games`);
    await page.getByRole("button", { name: /Little Letter Garden/ }).click();
    await expect(game).toHaveAttribute("data-letter", "A");
    await expect(page.getByText("0 of 52 letters grown", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Hear the letter", exact: true }).click();
    await page.getByRole("button", { name: "Exit", exact: true }).click();
    await expect(game).toHaveCount(0);
    assert.equal(sessions.length, 0, "browsing a lesson does not earn a completed-game reward");
    await page.getByRole("button", { name: /Little Letter Garden/ }).click();
    await traceLetter(page, "A", "uppercase");
    await page.getByRole("button", { name: "Exit", exact: true }).click();
    await expect(game.getByRole("alert")).toContainText("couldn't save");
    await page.getByRole("button", { name: "Exit", exact: true }).click();
    await expect(game).toHaveCount(0);
    assert.equal(sessions.length, 1);
    assert.equal(sessions[0].gameKey, "letter-garden");
    assert.deepEqual((sessions[0].metadata as Record<string, unknown>).lettersPracticed, ["A:uppercase"]);
    assert.ok(await page.evaluate(() => window.letterMedia.every(player => player.paused || player.ended)), "leaving cancels voice and effects");
    assert.deepEqual(errors, []);
    console.log(`Letter Garden browser checks passed: real tracing, shortcut rejection, pause/resume, demonstrations, touch, keyboard, saved stamps, 4 screen sizes and game/session integration. Screenshots: ${screenshots}`);
  } finally { await browser.close(); }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
