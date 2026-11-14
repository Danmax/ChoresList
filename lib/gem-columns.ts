import type { BlockDropAction, Piece } from "./block-drop";

export const COLUMNS_WIDTH = 6;
export const COLUMNS_HEIGHT = 13;
export type ColumnsState = {
  board: number[][];
  active: Piece;
  next: number[];
  score: number;
  cleared: number;
  pieces: number;
  over: boolean;
  phase: "falling" | "clearing";
  matches: [number, number][];
  chain: number;
  bestChain: number;
};

function randomColumn(random: () => number) { return Array.from({ length: 3 }, () => 1 + Math.floor(random() * 6)); }
function spawn(values: number[]): Piece { return { cells: values.map((value) => [value]), x: 2, y: 0 }; }
export function columnsLevel(cleared: number) { return 1 + Math.floor(cleared / 30); }
export function columnsDelay(cleared: number) { return Math.max(120, 900 - (columnsLevel(cleared) - 1) * 75); }

export function createColumns(random = Math.random): ColumnsState {
  return { board: Array.from({ length: COLUMNS_HEIGHT }, () => Array(COLUMNS_WIDTH).fill(0)), active: spawn(randomColumn(random)), next: randomColumn(random), score: 0, cleared: 0, pieces: 0, over: false, phase: "falling", matches: [], chain: 0, bestChain: 0 };
}

export function columnsFits(board: number[][], piece: Piece): boolean {
  return piece.cells.every((row, dy) => row.every((cell, dx) => !cell || (
    piece.x + dx >= 0 && piece.x + dx < COLUMNS_WIDTH && piece.y + dy >= 0 && piece.y + dy < COLUMNS_HEIGHT && !board[piece.y + dy][piece.x + dx]
  )));
}

export function columnsLanding(board: number[][], piece: Piece): Piece {
  let landed = piece;
  while (columnsFits(board, { ...landed, y: landed.y + 1 })) landed = { ...landed, y: landed.y + 1 };
  return landed;
}

// Collect every run before clearing, so intersecting matches count each cell once.
export function findColumnMatches(board: number[][]): [number, number][] {
  const found = new Map<string, [number, number]>();
  for (let y = 0; y < COLUMNS_HEIGHT; y++) for (let x = 0; x < COLUMNS_WIDTH; x++) {
    const value = board[y][x];
    if (!value) continue;
    for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [-1, 1]]) {
      const run: [number, number][] = [];
      for (let xx = x, yy = y; xx >= 0 && xx < COLUMNS_WIDTH && yy < COLUMNS_HEIGHT && board[yy][xx] === value; xx += dx, yy += dy) run.push([xx, yy]);
      if (run.length >= 3) run.forEach(([xx, yy]) => found.set(`${xx},${yy}`, [xx, yy]));
    }
  }
  return [...found.values()];
}

export function columnsGravity(board: number[][]): number[][] {
  const result = board.map((row) => [...row]);
  for (let x = 0; x < COLUMNS_WIDTH; x++) {
    const values = board.map((row) => row[x]).filter(Boolean);
    for (let y = 0; y < COLUMNS_HEIGHT; y++) result[y][x] = y < COLUMNS_HEIGHT - values.length ? 0 : values[y - (COLUMNS_HEIGHT - values.length)];
  }
  return result;
}

function resolve(state: ColumnsState, random: () => number): ColumnsState {
  const matches = findColumnMatches(state.board);
  if (matches.length) {
    const chain = state.chain + 1;
    return { ...state, phase: "clearing", matches, chain, bestChain: Math.max(state.bestChain, chain) };
  }
  const active = spawn(state.next);
  return { ...state, active, next: randomColumn(random), phase: "falling", matches: [], over: !columnsFits(state.board, active) };
}

export function advanceColumns(state: ColumnsState, action: BlockDropAction, random = Math.random): ColumnsState {
  if (state.over) return state;
  if (state.phase === "clearing") {
    if (action !== "tick") return state;
    const board = state.board.map((row) => [...row]);
    state.matches.forEach(([x, y]) => { board[y][x] = 0; });
    return resolve({ ...state, board: columnsGravity(board), score: state.score + state.matches.length * 10 * state.chain * columnsLevel(state.cleared), cleared: state.cleared + state.matches.length }, random);
  }
  if (action === "rotate") {
    const cells = [...state.active.cells.slice(1), state.active.cells[0]].map((row) => [...row]);
    return { ...state, active: { ...state.active, cells } };
  }
  if (action === "left" || action === "right") {
    const active = { ...state.active, x: state.active.x + (action === "left" ? -1 : 1) };
    return columnsFits(state.board, active) ? { ...state, active } : state;
  }
  const down = { ...state.active, y: state.active.y + 1 };
  if (action !== "drop" && columnsFits(state.board, down)) return { ...state, active: down, score: state.score + (action === "down" ? 1 : 0) };
  const active = action === "drop" ? columnsLanding(state.board, state.active) : state.active;
  const board = state.board.map((row) => [...row]);
  active.cells.forEach((row, y) => { board[active.y + y][active.x] = row[0]; });
  return resolve({ ...state, board, pieces: state.pieces + 1, chain: 0, score: state.score + (action === "drop" ? (active.y - state.active.y) * 2 : 0) }, random);
}
