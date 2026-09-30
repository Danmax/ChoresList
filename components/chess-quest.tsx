"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BookOpen, Bot, Crown, Lightbulb, RotateCcw, Sparkles, Swords } from "lucide-react";
import { Chess, type Square as ChessSquare } from "chess.js";

type Color = "white" | "black";
type Difficulty = "easy" | "medium" | "hard";
type Kind = "king" | "queen" | "rook" | "bishop" | "knight" | "pawn";
type Piece = { color: Color; kind: Kind };
type Square = Piece | null;
type Board = Square[];
type Move = { from: number; to: number };

const GLYPH: Record<Color, Record<Kind, string>> = {
  white: { king: "♔", queen: "♕", rook: "♖", bishop: "♗", knight: "♘", pawn: "♙" },
  black: { king: "♚", queen: "♛", rook: "♜", bishop: "♝", knight: "♞", pawn: "♟" },
};

const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
const PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const piece = (color: Color, kind: Kind): Piece => ({ color, kind });
const at = (file: string, rank: number) => (8 - rank) * 8 + files.indexOf(file);
const label = (index: number) => `${files[index % 8]}${8 - Math.floor(index / 8)}`;

function emptyBoard(): Board { return Array.from({ length: 64 }, () => null); }
function setupBoard(): Board {
  const board = emptyBoard();
  const order: Kind[] = ["rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook"];
  order.forEach((kind, file) => { board[file] = piece("black", kind); board[56 + file] = piece("white", kind); board[8 + file] = piece("black", "pawn"); board[48 + file] = piece("white", "pawn"); });
  return board;
}
function boardFromChess(chess: Chess): Board {
  const board = emptyBoard();
  const kinds: Record<string, Kind> = { k: "king", q: "queen", r: "rook", b: "bishop", n: "knight", p: "pawn" };
  chess.board().forEach((rank, row) => rank.forEach((item, col) => {
    if (item) board[row * 8 + col] = piece(item.color === "w" ? "white" : "black", kinds[item.type]);
  }));
  return board;
}

const PUZZLES: { title: string; lesson: string; prompt: string; board: Board; expected: Move; win: string }[] = [
  (() => { const board = emptyBoard(); board[at("g", 1)] = piece("white", "king"); board[at("d", 1)] = piece("white", "queen"); board[at("a", 8)] = piece("black", "king"); board[at("d", 8)] = piece("black", "rook"); return { title: "The Queen's Path", lesson: "Queens travel any number of squares in a straight line.", prompt: "Win the rook! Move your queen to d8.", board, expected: { from: at("d", 1), to: at("d", 8) }, win: "Excellent! Your queen moved straight up the file and captured the rook." }; })(),
  (() => { const board = emptyBoard(); board[at("g", 1)] = piece("white", "king"); board[at("e", 4)] = piece("white", "knight"); board[at("a", 8)] = piece("black", "king"); board[at("f", 6)] = piece("black", "queen"); return { title: "Knight's Leap", lesson: "Knights move in an L shape: two squares one way, then one sideways.", prompt: "Leap to f6 and capture the queen.", board, expected: { from: at("e", 4), to: at("f", 6) }, win: "Brilliant leap! Knights are the only pieces that can jump over others." }; })(),
  (() => { const board = emptyBoard(); board[at("g", 1)] = piece("white", "king"); board[at("c", 2)] = piece("white", "bishop"); board[at("a", 8)] = piece("black", "king"); board[at("g", 6)] = piece("black", "rook"); return { title: "Diagonal Dash", lesson: "Bishops glide as far as they like on diagonals.", prompt: "Slide to g6 and collect the rook.", board, expected: { from: at("c", 2), to: at("g", 6) }, win: "Nice diagonal! A bishop always stays on the same color square." }; })(),
  (() => { const board = emptyBoard(); board[at("g", 1)] = piece("white", "king"); board[at("a", 4)] = piece("white", "rook"); board[at("h", 8)] = piece("black", "king"); board[at("a", 7)] = piece("black", "bishop"); return { title: "Rook Rescue", lesson: "Rooks race up, down, and across — but never diagonally.", prompt: "Race up the a-file and capture the bishop on a7.", board, expected: { from: at("a", 4), to: at("a", 7) }, win: "Rook-tastic! Clear files help your rooks become powerful." }; })(),
  (() => { const board = emptyBoard(); board[at("g", 1)] = piece("white", "king"); board[at("e", 2)] = piece("white", "pawn"); board[at("a", 8)] = piece("black", "king"); board[at("f", 3)] = piece("black", "bishop"); return { title: "Brave Pawn", lesson: "Pawns walk straight ahead, but capture one square diagonally forward.", prompt: "Capture the bishop: move the pawn from e2 to f3.", board, expected: { from: at("e", 2), to: at("f", 3) }, win: "Great capture! Small pawns can make very big plays." }; })(),
  (() => { const board = emptyBoard(); board[at("g", 1)] = piece("white", "king"); board[at("e", 2)] = piece("white", "queen"); board[at("e", 8)] = piece("black", "king"); return { title: "Say Check!", lesson: "A king is in check when an opponent's piece attacks its square.", prompt: "Move the queen to e7 to give the black king check.", board, expected: { from: at("e", 2), to: at("e", 7) }, win: "Check! Your queen is attacking the king. The other player must respond." }; })(),
  (() => { const board = emptyBoard(); board[at("g", 1)] = piece("white", "king"); board[at("g", 8)] = piece("black", "rook"); board[at("a", 8)] = piece("black", "king"); return { title: "King's Safe Step", lesson: "Your king may move one square at a time and must stay out of danger.", prompt: "The rook attacks down the g-file. Step your king safely to h2.", board, expected: { from: at("g", 1), to: at("h", 2) }, win: "Safe and sound! Keeping your king protected is chess's most important job." }; })(),
  (() => { const board = emptyBoard(); board[at("g", 1)] = piece("white", "king"); board[at("e", 2)] = piece("white", "pawn"); board[at("a", 8)] = piece("black", "king"); return { title: "Opening Space", lesson: "A pawn on its starting square may move one or two squares forward when clear.", prompt: "Open the center: move the pawn from e2 to e4.", board, expected: { from: at("e", 2), to: at("e", 4) }, win: "Great opening! Central pawns give your pieces room to develop." }; })(),
  (() => { const board = emptyBoard(); board[at("g", 1)] = piece("white", "king"); board[at("d", 4)] = piece("white", "knight"); board[at("a", 8)] = piece("black", "king"); board[at("f", 5)] = piece("black", "rook"); return { title: "Fork Finder", lesson: "A knight can jump into a fork: one move that attacks more than one target.", prompt: "Jump to f5 and win the rook.", board, expected: { from: at("d", 4), to: at("f", 5) }, win: "Fork found! Knight jumps can create surprising attacks." }; })(),
  (() => { const board = emptyBoard(); board[at("g", 1)] = piece("white", "king"); board[at("d", 2)] = piece("white", "rook"); board[at("a", 8)] = piece("black", "king"); board[at("d", 7)] = piece("black", "queen"); return { title: "Rook Raid", lesson: "An open file lets a rook pressure pieces far away.", prompt: "Use the open d-file to capture the queen on d7.", board, expected: { from: at("d", 2), to: at("d", 7) }, win: "Excellent raid! Rooks love open files." }; })(),
  (() => { const board = emptyBoard(); board[at("g", 1)] = piece("white", "king"); board[at("c", 3)] = piece("white", "queen"); board[at("a", 8)] = piece("black", "king"); board[at("h", 8)] = piece("black", "bishop"); return { title: "Queen's Diagonal", lesson: "A queen combines the rook's straight lines and the bishop's diagonals.", prompt: "Glide along the diagonal to capture the bishop on h8.", board, expected: { from: at("c", 3), to: at("h", 8) }, win: "Perfect! The queen used her diagonal power." }; })(),
];

function inside(row: number, col: number) { return row >= 0 && row < 8 && col >= 0 && col < 8; }
function pseudoMoves(board: Board, from: number): number[] {
  const moving = board[from]; if (!moving) return [];
  const row = Math.floor(from / 8), col = from % 8, moves: number[] = [];
  const add = (r: number, c: number) => { if (inside(r, c) && (!board[r * 8 + c] || board[r * 8 + c]?.color !== moving.color)) moves.push(r * 8 + c); };
  const slide = (directions: number[][]) => directions.forEach(([dr, dc]) => { for (let r = row + dr, c = col + dc; inside(r, c); r += dr, c += dc) { const target = r * 8 + c; if (!board[target]) moves.push(target); else { if (board[target]?.color !== moving.color) moves.push(target); break; } } });
  if (moving.kind === "knight") [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([r,c]) => add(row+r,col+c));
  if (moving.kind === "king") [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([r,c]) => add(row+r,col+c));
  if (moving.kind === "rook" || moving.kind === "queen") slide([[-1,0],[1,0],[0,-1],[0,1]]);
  if (moving.kind === "bishop" || moving.kind === "queen") slide([[-1,-1],[-1,1],[1,-1],[1,1]]);
  if (moving.kind === "pawn") {
    const direction = moving.color === "white" ? -1 : 1;
    const forwardRow = row + direction;
    const forwardSquare = forwardRow * 8 + col;
    if (inside(forwardRow, col) && !board[forwardSquare]) {
      moves.push(forwardSquare);
      const homeRow = moving.color === "white" ? 6 : 1;
      const doubleRow = row + direction * 2;
      const doubleSquare = doubleRow * 8 + col;
      if (row === homeRow && inside(doubleRow, col) && !board[doubleSquare]) moves.push(doubleSquare);
    }
    [-1, 1].forEach((fileOffset) => {
      const captureRow = row + direction;
      const captureCol = col + fileOffset;
      if (!inside(captureRow, captureCol)) return;
      const captureSquare = captureRow * 8 + captureCol;
      const capturedPiece = board[captureSquare];
      if (capturedPiece && capturedPiece.color !== moving.color) moves.push(captureSquare);
    });
  }
  return moves;
}
function applyMove(board: Board, move: Move): Board { const next = [...board]; const source = next[move.from]; next[move.to] = source?.kind === "pawn" && (move.to < 8 || move.to >= 56) ? piece(source.color, "queen") : source; next[move.from] = null; return next; }
function attacksSquare(board: Board, from: number, target: number) {
  const moving = board[from]; if (!moving) return false;
  if (moving.kind !== "pawn") return pseudoMoves(board, from).includes(target);
  const row = Math.floor(from / 8), col = from % 8;
  const targetRow = Math.floor(target / 8), targetCol = target % 8;
  const direction = moving.color === "white" ? -1 : 1;
  return targetRow === row + direction && Math.abs(targetCol - col) === 1;
}
function inCheck(board: Board, color: Color) { const king = board.findIndex((item) => item?.color === color && item.kind === "king"); return king >= 0 && board.some((item, index) => item?.color !== color && attacksSquare(board, index, king)); }
function legalMoves(board: Board, color: Color) { const moves: Move[] = []; board.forEach((item, from) => { if (item?.color === color) pseudoMoves(board, from).forEach((to) => { const target = board[to]; if (target?.kind !== "king" && !inCheck(applyMove(board, { from, to }), color)) moves.push({ from, to }); }); }); return moves; }

function BoardView({ board, selected, targets, onSquare, disabled }: { board: Board; selected: number | null; targets: number[]; onSquare: (square: number) => void; disabled?: boolean }) {
  return <div className="grid w-full max-w-[34rem] grid-cols-8 overflow-hidden rounded-2xl border-4 border-violet-900 bg-violet-900 shadow-xl" role="grid" aria-label="Chess board">
    {board.map((item, index) => { const light = (Math.floor(index / 8) + index % 8) % 2 === 0; const isTarget = targets.includes(index); const pieceClass = item?.color === "white" ? "text-white [text-shadow:0_1px_0_#334155,1px_0_0_#334155,-1px_0_0_#334155,0_-1px_0_#334155]" : "text-slate-950 [text-shadow:0_1px_0_#f8e7bf,1px_0_0_#f8e7bf,-1px_0_0_#f8e7bf,0_-1px_0_#f8e7bf]"; return <button key={index} type="button" disabled={disabled} onClick={() => onSquare(index)} aria-label={`${label(index)}${item ? ` ${item.color} ${item.kind}` : " empty"}`} className={`relative aspect-square text-[clamp(1.35rem,7vw,3.25rem)] leading-none transition-colors ${light ? "bg-[#f8e7bf]" : "bg-[#ab754b]"} ${selected === index ? "ring-4 ring-inset ring-yellow-300" : ""} ${isTarget ? "after:absolute after:inset-[34%] after:rounded-full after:bg-violet-700/55" : ""}`}><span className={`relative z-10 ${pieceClass}`}>{item ? GLYPH[item.color][item.kind] : ""}</span>{index % 8 === 0 && <span className="absolute left-1 top-0.5 text-[9px] font-black text-violet-950/55">{8 - Math.floor(index / 8)}</span>}{Math.floor(index / 8) === 7 && <span className="absolute bottom-0.5 right-1 text-[9px] font-black text-violet-950/55">{files[index % 8]}</span>}</button>; })}
  </div>;
}

type Opponent = { id: string; name: string };
export type ChessStats = { gamesPlayed: number; wins: number; losses: number; draws: number; rating: number };
const DEFAULT_CHESS_STATS: ChessStats = { gamesPlayed: 0, wins: 0, losses: 0, draws: 0, rating: 100 };

function clockLabel(milliseconds: number) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function ChessQuest({ playerName, opponents, stats = DEFAULT_CHESS_STATS, onExit, onFinish }: { playerName: string; opponents: Opponent[]; stats?: ChessStats; onExit: () => void; onFinish: (score: number, durationSeconds: number, metadata: Record<string, unknown>) => void }) {
  const [mode, setMode] = useState<"home" | "lesson" | "match">("home");
  const [lesson, setLesson] = useState(0); const [board, setBoard] = useState<Board>(() => PUZZLES[0].board); const [selected, setSelected] = useState<number | null>(null); const [message, setMessage] = useState(""); const [solved, setSolved] = useState(0); const [turn, setTurn] = useState<Color>("white"); const [startedAt, setStartedAt] = useState(0); const [moves, setMoves] = useState(0); const [matchType, setMatchType] = useState<"ai" | "family">("ai"); const [opponentId, setOpponentId] = useState(""); const [difficulty, setDifficulty] = useState<Difficulty>("easy"); const [whiteMs, setWhiteMs] = useState(10 * 60_000); const [blackMs, setBlackMs] = useState(10 * 60_000);
  const moveSound = useRef<HTMLAudioElement | null>(null);
  const chess = useRef(new Chess());
  const opponent = opponents.find((item) => item.id === opponentId) ?? null;
  const blackName = matchType === "family" && opponent ? opponent.name : "Castle Guide";
  const activePlayer = turn === "white" ? playerName : blackName;
  const timedOut = whiteMs <= 0 || blackMs <= 0;
  // No move cap: a match ends only by normal chess rules or either player's
  // ten-minute clock reaching zero. The legacy cap expression below becomes
  // true only after a timeout, which also locks the board and shows Finish.
  const maxMoves = timedOut ? 0 : Number.POSITIVE_INFINITY;
  const targets = useMemo(() => selected === null ? [] : (mode === "lesson" ? pseudoMoves(board, selected) : chess.current.moves({ square: label(selected) as ChessSquare, verbose: true }).map((move) => at(move.to[0], Number(move.to[1])))), [board, selected, mode]);
  function playMoveSound() { const sound = moveSound.current ?? new Audio("/games/chess-move.wav"); moveSound.current = sound; sound.currentTime = 0; void sound.play().catch(() => undefined); }
  function beginLesson() { setLesson(0); setBoard(PUZZLES[0].board); setMode("lesson"); setSelected(null); setMessage(PUZZLES[0].prompt); setSolved(0); setStartedAt(Date.now()); }
  function beginMatch(type: "ai" | "family") { chess.current = new Chess(); setBoard(boardFromChess(chess.current)); setMode("match"); setMatchType(type); setDifficulty("medium"); setSelected(null); setMessage(type === "family" ? `${playerName} is White. Take the first move!` : "Normal chess against the Castle Guide — your turn!"); setTurn("white"); setMoves(0); setWhiteMs(10 * 60_000); setBlackMs(10 * 60_000); setStartedAt(Date.now()); }
  function finish(score: number, metadata: Record<string, unknown>) { onFinish(score, Math.max(1, Math.round((Date.now() - startedAt) / 1000)), metadata); }
  function matchOutcome(): "win" | "loss" | "draw" { if (timedOut) return whiteMs <= 0 ? "loss" : "win"; if (chess.current.isCheckmate()) return chess.current.turn() === "b" ? "win" : "loss"; return "draw"; }
  function finishMatch() { const result = matchOutcome(); const score = result === "win" ? Math.max(160, moves * 14) : result === "draw" ? Math.max(100, moves * 10) : Math.max(80, moves * 8); const expected = 1 / (1 + 10 ** ((100 - stats.rating) / 400)); const actual = result === "win" ? 1 : result === "draw" ? 0.5 : 0; const ratingAfter = Math.max(100, Math.round(stats.rating + 32 * (actual - expected))); finish(score, { mode: matchType === "family" ? "family" : "normal", moves, opponent: matchType === "family" ? blackName : "Castle Guide", result, ratingBefore: stats.rating, ratingAfter }); }
  function gameMessage() { if (chess.current.isCheckmate()) return `Checkmate! ${chess.current.turn() === "w" ? blackName : playerName} wins!`; if (chess.current.isStalemate()) return "Stalemate — a draw!"; if (chess.current.isThreefoldRepetition()) return "Draw by repetition."; if (chess.current.isInsufficientMaterial()) return "Draw — not enough material to checkmate."; if (chess.current.isDraw()) return "Draw!"; return ""; }
  useEffect(() => {
    if (mode !== "match" || chess.current.isGameOver() || timedOut) return;
    const timer = window.setInterval(() => {
      if (turn === "white") setWhiteMs((value) => Math.max(0, value - 250));
      else setBlackMs((value) => Math.max(0, value - 250));
    }, 250);
    return () => window.clearInterval(timer);
  }, [mode, turn, timedOut]);
  useEffect(() => {
    if (mode === "match" && timedOut) setMessage(`${whiteMs <= 0 ? playerName : blackName} ran out of time.`);
  }, [mode, timedOut, whiteMs, blackMs, playerName, blackName]);
  function aiMove() { const options = chess.current.moves({ verbose: true }); if (!options.length) { setMessage(gameMessage()); return; } const captures = options.filter((move) => move.captured); let choices = difficulty === "easy" ? options : (captures.length ? captures : options); if (difficulty === "hard") { const score = (move: typeof options[number]) => { const trial = new Chess(chess.current.fen()); trial.move({ from: move.from, to: move.to, promotion: move.promotion ?? "q" }); return trial.board().flat().reduce((total, item) => total + (item ? (item.color === "b" ? 1 : -1) * PIECE_VALUE[item.type] : 0), 0); }; const best = Math.max(...choices.map(score)); choices = choices.filter((move) => score(move) === best); } const pick = choices[Math.floor(Math.random() * choices.length)]; chess.current.move({ from: pick.from, to: pick.to, promotion: pick.promotion ?? "q" }); playMoveSound(); setBoard(boardFromChess(chess.current)); setTurn("white"); setMessage(chess.current.isGameOver() ? gameMessage() : chess.current.isCheck() ? "The guide gives check! Find a safe move." : "Your turn — look for a clever move."); }
  function clickSquare(square: number) {
    if (mode === "lesson") { const puzzle = PUZZLES[lesson]; if (selected === null) { if (board[square]?.color === "white") setSelected(square); return; } if (square === selected) { setSelected(null); return; } if (!targets.includes(square)) { setMessage("That piece cannot move there. Try the glowing path!"); return; } if (selected === puzzle.expected.from && square === puzzle.expected.to) { playMoveSound(); setBoard(applyMove(board, { from: selected, to: square })); setSelected(null); setSolved((value) => value + 1); setMessage(puzzle.win); } else { setSelected(null); setMessage("Good idea, but this quest has one special target. Try again!"); } return; }
    if (mode !== "match") return;
    if (selected === null) { if (board[square]?.color === turn) setSelected(square); return; }
    if (square === selected) { setSelected(null); return; }
    if (!targets.includes(square)) { if (board[square]?.color === turn) setSelected(square); else { setSelected(null); setMessage("Choose one of the glowing legal moves."); } return; }
    const move = chess.current.move({ from: label(selected) as ChessSquare, to: label(square) as ChessSquare, promotion: "q" });
    if (!move) { setSelected(null); setMessage("That move is not legal — try a glowing square."); return; }
    const nextMoves = moves + 1; const nextTurn: Color = chess.current.turn() === "w" ? "white" : "black"; playMoveSound(); setBoard(boardFromChess(chess.current)); setSelected(null); setMoves(nextMoves); setTurn(nextTurn); if (chess.current.isGameOver()) { setMessage(gameMessage()); return; } if (matchType === "ai") { window.setTimeout(aiMove, 420); } else { setMessage(`${nextTurn === "white" ? playerName : blackName}'s turn — pass the device!`); }
  }
  const puzzleDone = mode === "lesson" && solved > lesson;
  return <main className="mx-auto max-w-5xl pb-8"><div className="mb-5 flex items-center justify-between"><button type="button" onClick={mode === "home" ? onExit : () => setMode("home")} className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 font-black text-slate-700 shadow-sm"><ArrowLeft size={18} /> {mode === "home" ? "Games" : "Quest map"}</button><span className="rounded-full bg-violet-100 px-4 py-2 text-sm font-black text-violet-700">♟ Chess Quest</span></div>{mode === "home" ? <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-violet-700 via-fuchsia-700 to-indigo-800 p-6 text-white shadow-xl sm:p-10"><div className="max-w-xl"><span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-black"><Sparkles size={16} /> Learn by playing</span><h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">Welcome to Chess Quest!</h2><p className="mt-3 text-lg font-bold leading-7 text-violet-100">Meet every piece, learn how check works, then play a normal game against the Castle Guide or a family member.</p><div className="mt-6 grid grid-cols-2 gap-2 text-xs font-black sm:grid-cols-4"><span className="rounded-xl bg-white/10 px-3 py-2">{stats.rating} Elo</span><span className="rounded-xl bg-white/10 px-3 py-2">{stats.gamesPlayed} games</span><span className="rounded-xl bg-white/10 px-3 py-2">{stats.wins} wins</span><span className="rounded-xl bg-white/10 px-3 py-2">{stats.losses} losses · {stats.draws} draws</span></div><div className="mt-7 grid gap-3 sm:grid-cols-2"><button type="button" onClick={beginLesson} className="rounded-2xl bg-yellow-300 p-4 text-left text-violet-950 shadow-lg transition-transform hover:-translate-y-0.5"><BookOpen size={24}/><span className="mt-2 block text-lg font-black">Start the lessons</span><span className="text-sm font-bold">{PUZZLES.length} bite-size puzzles</span></button><button type="button" onClick={() => beginMatch("ai")} className="rounded-2xl bg-white/15 p-4 text-left text-white ring-1 ring-white/30 transition-transform hover:-translate-y-0.5"><Bot size={24}/><span className="mt-2 block text-lg font-black">Normal Chess</span><span className="text-sm font-bold text-violet-100">Standard game · 10 minute clock</span></button></div>{opponents.length > 0 && <div className="mt-4 rounded-2xl border border-white/20 bg-white/10 p-4"><p className="text-sm font-black">Family showdown · pass &amp; play</p><div className="mt-3 flex flex-col gap-2 sm:flex-row"><select aria-label="Choose a family opponent" value={opponentId} onChange={(event) => setOpponentId(event.target.value)} className="min-w-0 flex-1 rounded-xl bg-white px-3 py-2 font-bold text-violet-950"><option value="">Choose a player</option>{opponents.map((item) => <option key={item.id} value={item.id}>{item.name} plays Black</option>)}</select><button type="button" disabled={!opponent} onClick={() => beginMatch("family")} className="rounded-xl bg-emerald-400 px-4 py-2 font-black text-emerald-950 disabled:cursor-not-allowed disabled:opacity-50">Play together</button></div></div>}</div></section> : <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]"><div><BoardView board={board} selected={selected} targets={targets} onSquare={clickSquare} disabled={mode === "lesson" && puzzleDone || mode === "match" && (matchType === "ai" && turn !== "white" || moves >= maxMoves)} /></div><aside className="rounded-3xl bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-2 text-violet-700"><span className="flex items-center gap-2"><Crown size={22}/><span className="font-black">{mode === "lesson" ? PUZZLES[lesson].title : matchType === "family" ? `${playerName} vs ${blackName}` : "Normal Chess"}</span></span>{mode === "lesson" && <span className="rounded-full bg-violet-100 px-2 py-1 text-xs font-black">{lesson + 1}/{PUZZLES.length}</span>}</div><p className="mt-4 text-lg font-black text-slate-800">{mode === "lesson" ? PUZZLES[lesson].lesson : matchType === "family" ? `${activePlayer}'s turn · ${turn === "white" ? "White" : "Black"}` : "Play White against the Castle Guide."}</p><p aria-live="polite" className="mt-3 rounded-2xl bg-violet-50 p-4 text-sm font-bold leading-6 text-violet-900">{message}</p>{mode === "lesson" && <div className="mt-5"><div className="flex gap-2">{PUZZLES.map((_, index) => <span key={index} className={`h-2 flex-1 rounded-full ${index < solved ? "bg-emerald-500" : index === lesson ? "bg-violet-600" : "bg-slate-200"}`}/>)}</div>{puzzleDone ? lesson < PUZZLES.length - 1 ? <button type="button" onClick={() => { const next = lesson + 1; setLesson(next); setBoard(PUZZLES[next].board); setMessage(PUZZLES[next].prompt); }} className="mt-4 w-full rounded-xl bg-violet-700 px-4 py-3 font-black text-white">Next lesson</button> : <button type="button" onClick={() => finish(300, { mode: "lessons", puzzlesSolved: PUZZLES.length })} className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-3 font-black text-white">Claim quest stars</button> : <button type="button" onClick={() => setMessage(PUZZLES[lesson].prompt)} className="mt-4 inline-flex items-center gap-2 font-black text-violet-700"><Lightbulb size={18}/> Show my mission</button>}</div>}{mode === "match" && <div className="mt-5 space-y-3"><p className="text-sm font-black text-slate-500">Moves played: {moves}{timedOut ? " · time expired" : ""}</p>{(timedOut || chess.current.isGameOver()) && <button type="button" onClick={finishMatch} className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-black text-white">Save {matchOutcome()} · Elo {stats.rating}</button>}<button type="button" onClick={() => beginMatch(matchType)} className="inline-flex items-center gap-2 font-black text-violet-700"><RotateCcw size={18}/> New board</button></div>}</aside></section>}</main>;
}
