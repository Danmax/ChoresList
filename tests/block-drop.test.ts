import test from "node:test";
import assert from "node:assert/strict";
import { advanceBlockDrop, BOARD_HEIGHT, BOARD_WIDTH, createBlockDrop, fallDelay, fits, landingPiece, PIECES, shuffledBag, spawnPiece, type BlockDropAction } from "../lib/block-drop";
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
  const flashing = advanceBlockDrop(game, "tick");
  assert.equal(flashing.phase, "clearing");
  assert.deepEqual(flashing.clearingRows, [16, 17, 18, 19]);
  assert.equal(flashing.board.flat().filter(Boolean).length, 40);
  assert.equal(flashing.lines, 9);
  assert.equal(flashing.score, 0);
  assert.equal(flashing.pieces, 1);
  assert.deepEqual(flashing.queue, game.queue, "next piece waits until the flash ends");
  assert.equal(game.board[16][4], 0, "locking must not mutate the previous board");
  for (const action of ["left", "right", "rotate", "down", "drop"] as BlockDropAction[]) {
    assert.equal(advanceBlockDrop(flashing, action), flashing, `${action} must wait for the flash`);
  }
  const next = advanceBlockDrop(flashing, "tick");
  assert.equal(next.phase, "falling");
  assert.deepEqual(next.clearingRows, []);
  assert.equal(next.lines, 13);
  assert.equal(next.score, 800);
  assert.equal(next.board.flat().filter(Boolean).length, 0);
  assert.equal(next.board.length, 20);
  assert.equal(next.pieces, 1, "finishing the flash must not lock a second piece");
  assert.deepEqual(next.active, spawnPiece(game.queue[0]));
  assert.equal(flashing.board.flat().filter(Boolean).length, 40, "clearing must not mutate the flashing board");
  assert.ok(fallDelay(next.lines) < fallDelay(game.lines));
  assert.ok(fallDelay(1000) >= 100);
});

for (const count of [1, 2, 3]) {
  test(`${count}-line clear keeps rows visible until the next tick, then collapses the stack`, () => {
    const game = createBlockDrop();
    for (let y = BOARD_HEIGHT - count; y < BOARD_HEIGHT; y++) {
      game.board[y] = Array.from({ length: BOARD_WIDTH }, (_, x) => x === 4 ? 0 : 2);
    }
    game.board[15][0] = 7;
    game.active = { cells: [[1], [1], [1], [1]], x: 4, y: 0 };
    const flashing = advanceBlockDrop(game, "drop");
    assert.equal(flashing.phase, "clearing");
    assert.equal(flashing.clearingRows.length, count);
    assert.equal(flashing.lines, 0);
    assert.equal(flashing.score, 32, "hard-drop points are awarded once at landing");
    const next = advanceBlockDrop(flashing, "tick");
    assert.equal(next.lines, count);
    assert.equal(next.score, 32 + [0, 100, 300, 500][count]);
    assert.equal(next.board[15 + count][0], 7, "blocks above the clear fall into the gap");
    assert.equal(next.board.flat().filter(Boolean).length, 1 + 4 - count);
    assert.equal(next.phase, "falling");
    assert.ok(fits(next.board, next.active));
  });
}

test("separated full rows flash together and preserve intervening blocks", () => {
  const game = createBlockDrop();
  for (const y of [17, 19]) game.board[y] = Array.from({ length: BOARD_WIDTH }, (_, x) => x === 4 ? 0 : 2);
  game.board[18][0] = 7;
  game.active = { cells: [[1], [1], [1], [1]], x: 4, y: 16 };
  const flashing = advanceBlockDrop(game, "down");
  assert.deepEqual(flashing.clearingRows, [17, 19]);
  const next = advanceBlockDrop(flashing, "tick");
  assert.equal(next.lines, 2);
  assert.equal(next.board[19][0], 7);
  assert.equal(next.board[19][4], 1);
  assert.equal(next.board[18][4], 1);
});

test("checks top-out after clearing rows makes room for the next piece", () => {
  const game = createBlockDrop();
  game.queue = ["O", ...game.queue];
  game.board[0][4] = 2;
  for (const y of [18, 19]) game.board[y] = Array.from({ length: BOARD_WIDTH }, (_, x) => x === 4 ? 0 : 2);
  game.active = { cells: [[1], [1], [1], [1]], x: 4, y: 16 };
  const flashing = advanceBlockDrop(game, "tick");
  assert.equal(flashing.over, false);
  const next = advanceBlockDrop(flashing, "tick");
  assert.equal(next.lines, 2);
  assert.equal(next.over, false, "clearing moves the obstruction below the O-piece spawn");
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
