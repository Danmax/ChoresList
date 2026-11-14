import test from "node:test";
import assert from "node:assert/strict";
import { advanceColumns, columnsDelay, columnsFits, columnsGravity, columnsLanding, columnsLevel, createColumns, findColumnMatches } from "../lib/gem-columns";

const empty = () => createColumns().board;

test("columns spawn three symbols with a next preview; cycling preserves the stack", () => {
  let index = 0;
  const state = createColumns(() => [0, 0.2, 0.4, 0.6, 0.8, 0.99][index++]);
  assert.deepEqual(state.active.cells, [[1], [2], [3]]);
  assert.deepEqual(state.next, [4, 5, 6]);
  assert.ok(columnsFits(state.board, state.active));
  const rotated = advanceColumns(state, "rotate");
  assert.deepEqual(rotated.active.cells, [[2], [3], [1]]);
  assert.deepEqual(advanceColumns(advanceColumns(rotated, "rotate"), "rotate").active, state.active);
  assert.deepEqual(state.active.cells, [[1], [2], [3]]);
});

for (const [name, dx, dy] of [["horizontal", 1, 0], ["vertical", 0, 1], ["diagonal down-right", 1, 1], ["diagonal down-left", -1, 1]] as const) {
  test(`finds ${name} runs of three or more`, () => {
    const board = empty();
    const startX = dx === -1 ? 4 : 1;
    for (let i = 0; i < 4; i++) board[5 + i * dy][startX + i * dx] = 2;
    assert.equal(findColumnMatches(board).length, 4);
  });
}

test("matches count crossing cells once and do not wrap at edges", () => {
  const board = empty();
  board[8][1] = board[8][2] = board[8][3] = 1;
  board[7][2] = board[9][2] = 1;
  assert.equal(findColumnMatches(board).length, 5);
  const edges = empty();
  edges[10][5] = edges[11][0] = edges[11][1] = 1;
  assert.deepEqual(findColumnMatches(edges), []);
  assert.deepEqual(findColumnMatches(empty()), []);
});

test("gravity closes gaps independently in each column without reordering or mutation", () => {
  const board = empty();
  board[1][0] = 2;
  board[4][0] = 3;
  board[3][1] = 4;
  const result = columnsGravity(board);
  assert.equal(result[11][0], 2);
  assert.equal(result[12][0], 3);
  assert.equal(result[12][1], 4);
  assert.equal(board[1][0], 2);
});

test("movement stays inside walls; hard drop settles and soft drop awards points", () => {
  let state = createColumns();
  state.active.cells = [[1], [2], [3]];
  for (let i = 0; i < 10; i++) state = advanceColumns(state, "left");
  assert.equal(state.active.x, 0);
  assert.equal(advanceColumns(state, "left"), state);
  assert.equal(advanceColumns(state, "down").score, 1);
  const landed = columnsLanding(state.board, state.active);
  assert.equal(landed.y, 10);
  const next = advanceColumns(state, "drop");
  assert.equal(next.pieces, 1);
  assert.equal(next.score, 20);
  assert.deepEqual(next.board.slice(10).map((row) => row[0]), [1, 2, 3]);
  assert.equal(state.board.flat().filter(Boolean).length, 0);
});

test("cascades flash before clearing, apply gravity, and multiply chain points", () => {
  const chain = createColumns();
  chain.board[12][0] = chain.board[12][1] = chain.board[12][2] = 1;
  chain.board[11][0] = chain.board[11][1] = 2;
  chain.board[12][3] = 2;
  chain.active = { x: 2, y: 8, cells: [[2], [1], [1]] };
  const wave1 = advanceColumns(chain, "drop");
  assert.equal(wave1.phase, "clearing");
  assert.equal(wave1.matches.length, 5);
  const wave2 = advanceColumns(wave1, "tick");
  assert.equal(wave2.phase, "clearing");
  assert.equal(wave2.chain, 2);
  assert.equal(wave2.matches.length, 4);
  const settled = advanceColumns(wave2, "tick");
  assert.equal(settled.phase, "falling");
  assert.equal(settled.cleared, 9);
  assert.equal(settled.bestChain, 2);
  assert.equal(settled.score, 50 + 80 + 2);
  assert.equal(settled.board.flat().filter(Boolean).length, 0);
  assert.equal(chain.board[12][0], 1);
});

test("blocked spawn ends play, while a clearing match can rescue the spawn", () => {
  const state = createColumns();
  state.board[2][2] = 4;
  state.active = { x: 0, y: 10, cells: [[1], [2], [3]] };
  const over = advanceColumns(state, "tick");
  assert.ok(over.over);
  assert.equal(advanceColumns(over, "drop"), over);

  const rescue = createColumns();
  rescue.board[0][2] = rescue.board[1][2] = rescue.board[2][2] = 1;
  rescue.active = { x: 0, y: 10, cells: [[2], [3], [4]] };
  const clearing = advanceColumns(rescue, "tick");
  assert.equal(clearing.phase, "clearing");
  const saved = advanceColumns(clearing, "tick");
  assert.equal(saved.over, false);
  assert.ok(columnsFits(saved.board, saved.active));
  assert.equal(columnsLevel(30), 2);
  assert.ok(columnsDelay(30) < columnsDelay(0));
  assert.ok(columnsDelay(10000) >= 120);
});
