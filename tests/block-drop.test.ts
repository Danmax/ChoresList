import test from "node:test";
import assert from "node:assert/strict";
import { advanceBlockDrop, BOARD_HEIGHT, BOARD_WIDTH, createBlockDrop, fallDelay, fits, landingPiece, PIECES, shuffledBag, spawnPiece } from "../lib/block-drop";
import { DEFAULT_GAME_SETTINGS, gameByKey } from "../lib/games";

test("Block Drop is registered with parent controls and rewards", () => {
  assert.equal(gameByKey("block-drop")?.title, "Block Drop");
  assert.equal(DEFAULT_GAME_SETTINGS["block-drop"].dailyPlayLimit, 3);
});

test("bags contain all seven pieces and every piece spawns inside the board", () => {
  const game = createBlockDrop();
  assert.equal(game.board.length, BOARD_HEIGHT);
  assert.ok(game.board.every((row) => row.length === BOARD_WIDTH));
  assert.deepEqual(shuffledBag().sort(), Object.keys(PIECES).sort());
  for (const kind of shuffledBag()) assert.ok(fits(game.board, spawnPiece(kind)));
});

test("movement, rotation, and hard drop respect boundaries without mutating the board", () => {
  let game = { ...createBlockDrop(), active: spawnPiece("T") };
  const source = game;
  const original = JSON.stringify(source);
  game = advanceBlockDrop(game, "rotate");
  assert.equal(game.active.cells[1][2], 3);
  for (let i = 0; i < 20; i++) game = advanceBlockDrop(game, "left");
  assert.ok(fits(game.board, game.active));
  assert.equal(advanceBlockDrop(game, "left"), game);
  const landed = landingPiece(game.board, game.active);
  assert.ok(!fits(game.board, { ...landed, y: landed.y + 1 }));
  const dropped = advanceBlockDrop(game, "drop");
  assert.equal(dropped.pieces, 1);
  assert.equal(dropped.board.flat().filter(Boolean).length, 4);
  assert.ok(dropped.score > 0);
  assert.equal(JSON.stringify(source), original);
  assert.equal(game.board.flat().filter(Boolean).length, 0);
});

test("clears four rows together and awards points at the previous level", () => {
  const game = createBlockDrop();
  for (let y = 16; y < 20; y++) game.board[y] = Array.from({ length: 10 }, (_, x) => x === 4 ? 0 : 2);
  game.active = { cells: [[1], [1], [1], [1]], x: 4, y: 16 };
  game.lines = 9;
  const next = advanceBlockDrop(game, "tick");
  assert.equal(next.lines, 13);
  assert.equal(next.score, 800);
  assert.equal(next.board.flat().filter(Boolean).length, 0);
  assert.equal(next.board.length, 20);
  assert.ok(fallDelay(next.lines) < fallDelay(game.lines));
  assert.ok(fallDelay(1000) >= 100);
});

test("settles soft drops on stacks and ends when the next spawn is blocked", () => {
  const game = createBlockDrop();
  game.queue = ["O", ...game.queue];
  game.board[0][4] = 2;
  game.active = { ...spawnPiece("O"), x: 0, y: 18 };
  const next = advanceBlockDrop(game, "down");
  assert.equal(next.pieces, 1);
  assert.equal(next.over, true);
  assert.equal(advanceBlockDrop(next, "drop"), next);
});

test("many drops maintain valid boards and a populated queue", () => {
  let game = createBlockDrop();
  for (let i = 0; i < 100 && !game.over; i++) {
    game = advanceBlockDrop(game, i % 2 ? "left" : "right");
    game = advanceBlockDrop(game, "drop");
    assert.ok(game.queue.length > 0);
    assert.ok(game.board.every((row) => row.length === 10));
  }
  assert.ok(game.over);
});
