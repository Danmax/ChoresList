export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;
export const PIECES = {
  I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
  O: [[2, 2], [2, 2]],
  T: [[0, 3, 0], [3, 3, 3], [0, 0, 0]],
  S: [[0, 4, 4], [4, 4, 0], [0, 0, 0]],
  Z: [[5, 5, 0], [0, 5, 5], [0, 0, 0]],
  J: [[6, 0, 0], [6, 6, 6], [0, 0, 0]],
  L: [[0, 0, 7], [7, 7, 7], [0, 0, 0]],
} as const;
export type PieceKind = keyof typeof PIECES;
export type Piece = { cells: number[][]; x: number; y: number };
export type BlockDropState = {
  board: number[][];
  active: Piece;
  queue: PieceKind[];
  score: number;
  lines: number;
  pieces: number;
  over: boolean;
  phase: "falling" | "clearing";
  clearingRows: number[];
};
export type BlockDropAction = "left" | "right" | "rotate" | "down" | "tick" | "drop";

export function shuffledBag(random = Math.random): PieceKind[] {
  const bag = Object.keys(PIECES) as PieceKind[];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

export function spawnPiece(kind: PieceKind): Piece {
  const cells = PIECES[kind].map((row) => [...row]);
  return { cells, x: Math.floor((BOARD_WIDTH - cells.length) / 2), y: 0 };
}

export function createBlockDrop(random = Math.random): BlockDropState {
  const bag = shuffledBag(random);
  return { board: Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0)), active: spawnPiece(bag[0]), queue: bag.slice(1), score: 0, lines: 0, pieces: 0, over: false, phase: "falling", clearingRows: [] };
}

export function fits(board: number[][], piece: Piece): boolean {
  return piece.cells.every((row, dy) => row.every((cell, dx) => !cell || (
    piece.x + dx >= 0 && piece.x + dx < BOARD_WIDTH && piece.y + dy >= 0 && piece.y + dy < BOARD_HEIGHT && !board[piece.y + dy][piece.x + dx]
  )));
}

export function landingPiece(board: number[][], piece: Piece): Piece {
  let landed = piece;
  while (fits(board, { ...landed, y: landed.y + 1 })) landed = { ...landed, y: landed.y + 1 };
  return landed;
}

export function blockDropLevel(lines: number) { return 1 + Math.floor(lines / 10); }
export function fallDelay(lines: number) { return Math.max(100, 850 - (blockDropLevel(lines) - 1) * 70); }

function spawnNext(state: BlockDropState, random: () => number): BlockDropState {
  const queue = state.queue.length < 7 ? [...state.queue, ...shuffledBag(random)] : [...state.queue];
  const next = spawnPiece(queue.shift()!);
  return { ...state, active: next, queue, over: !fits(state.board, next) };
}

function lockPiece(state: BlockDropState, active: Piece, bonus: number, random: () => number): BlockDropState {
  const board = state.board.map((row) => [...row]);
  active.cells.forEach((row, dy) => row.forEach((cell, dx) => { if (cell) board[active.y + dy][active.x + dx] = cell; }));
  const clearingRows = board.flatMap((row, y) => row.every(Boolean) ? [y] : []);
  const locked = { ...state, board, score: state.score + bonus, pieces: state.pieces + 1, clearingRows };
  return clearingRows.length ? { ...locked, phase: "clearing" } : spawnNext(locked, random);
}

export function advanceBlockDrop(state: BlockDropState, action: BlockDropAction, random = Math.random): BlockDropState {
  if (state.over) return state;
  if (state.phase === "clearing") {
    if (action !== "tick") return state;
    const cleared = state.clearingRows.length;
    const remaining = state.board.filter((_, y) => !state.clearingRows.includes(y));
    const board = [...Array.from({ length: cleared }, () => Array(BOARD_WIDTH).fill(0)), ...remaining];
    return spawnNext({ ...state, board, score: state.score + [0, 100, 300, 500, 800][cleared] * blockDropLevel(state.lines), lines: state.lines + cleared, phase: "falling", clearingRows: [] }, random);
  }
  const active = state.active;
  if (action === "left" || action === "right") {
    const moved = { ...active, x: active.x + (action === "left" ? -1 : 1) };
    return fits(state.board, moved) ? { ...state, active: moved } : state;
  }
  if (action === "rotate") {
    const cells = active.cells[0].map((_, x) => active.cells.map((row) => row[x]).reverse());
    for (const dx of [0, -1, 1, -2, 2]) {
      const rotated = { ...active, cells, x: active.x + dx };
      if (fits(state.board, rotated)) return { ...state, active: rotated };
    }
    return state;
  }
  if (action === "drop") {
    const landed = landingPiece(state.board, active);
    return lockPiece(state, landed, (landed.y - active.y) * 2, random);
  }
  const moved = { ...active, y: active.y + 1 };
  return fits(state.board, moved)
    ? { ...state, active: moved, score: state.score + (action === "down" ? 1 : 0) }
    : lockPiece(state, active, 0, random);
}
