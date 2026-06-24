import { Chess } from "chess.js";
import { AnalysisMove, GameMetadata, GameReport, MoveClassification } from "../types";

// Famous Chess Game Presets for Instant Demo
export const CHESS_PRESETS = [
  {
    name: "tejasvajra vs. traber_77 (2026)",
    description: "The King's Gambit Accepted game from Chess.com with a brilliant bishop sacrifice Bxg6 on move 20.",
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.06.24"]
[Round "?"]
[White "tejasvajra"]
[Black "traber_77"]
[Result "1-0"]
[TimeControl "600"]
[WhiteElo "800"]
[BlackElo "794"]
[Termination "tejasvajra won by checkmate"]
[ECO "C34"]
[EndTime "4:36:51 GMT+0000"]
[Link "https://www.chess.com/game/live/170633530802"]

1. e4 e5 2. f4 exf4 3. Nf3 Nc6 4. Bc4 Nf6 5. O-O Bc5+ 6. d4 Be7 7. Ng5 O-O 8. h3 h6 9. Nf3 Nxe4 10. Bxf4 d5 11. Bd3 Bd6 12. Bxd6 Qxd6 13. Nc3 Nxc3 14. bxc3 Be6 15. Nh4 Rae8 16. Qf3 Re7 17. Nf5 Bxf5 18. Qxf5 g6 19. Qf3 Qa3 20. Bxg6 Ree8 21. Bxf7+ Kh8 22. Qf6+ Kh7 23. Qg6+ Kh8 24. Qxh6# 1-0`
  },
  {
    name: "Kasparov vs. Deep Blue (1996)",
    description: "The historic game 1 where Garry Kasparov, playing white, faced IBM's Deep Blue supercomputer in Philadelphia.",
    pgn: `[Event "Kasparov - Deep Blue Match"]
[Site "Philadelphia, PA USA"]
[Date "1996.02.10"]
[Round "1"]
[White "Deep Blue (Computer)"]
[Black "Garry Kasparov"]
[Result "1-0"]

1. e4 c5 2. c3 d5 3. exd5 Qxd5 4. d4 Nf6 5. Nf3 Bg4 6. Be2 e6 7. h3 Bh5 8. O-O Nc6 9. Be3 cxd4 10. cxd4 Bb4 11. a3 Ba5 12. Nc3 Qd6 13. Nb5 Qe7 14. Ne5 Bxe2 15. Qxe2 O-O 16. Rac1 Rac8 17. Bg5 Bb6 18. Bxf6 gxf6 19. Nc4 Rfd8 20. Nxb6 axb6 21. Rfd1 f5 22. Qe3 Qf6 23. d5 Rxd5 24. Rxd5 exd5 25. b3 Kh8 26. Qxb6 Rg8 27. Qc5 d4 28. Nd6 f4 29. Nxb7 Ne5 30. Qd5 f3 31. g3 Nd3 32. Rc7 Re8 33. Nd6 Re1+ 34. Kh2 Nxf2 35. Nxf7+ Kg7 36. Ng5+ Kh6 37. Rxh7+ 1-0`
  },
  {
    name: "Carlsen vs. Nakamura (Meltwater 2021)",
    description: "A brilliant, high-tension rapid title encounter between the world champion Magnus Carlsen and speed chess king Hikaru Nakamura.",
    pgn: `[Event "Meltwater Champions Chess Tour"]
[Site "chess24.com INT"]
[Date "2021.08.31"]
[Round "1.1"]
[White "Magnus Carlsen"]
[Black "Hikaru Nakamura"]
[Result "1-0"]

1. d4 Nf6 2. c4 e6 3. Nf3 d5 4. Nc3 Be7 5. Bf4 O-O 6. e3 c5 7. dxc5 Bxc5 8. a3 Nc6 9. Qc2 Re8 10. O-O-O e5 11. Bg5 d4 12. exd4 Nxd4 13. Nxd4 exd4 14. Nd5 Be7 15. Nxe7+ Qxe7 16. Bd3 h6 17. Bh4 Qd6 18. Kb1 Bd7 19. f3 Bc6 20. Bf2 Rad8 21. Rhe1 Rxe1 22. Bxe1 Qxh2 23. Ba5 b6 24. Bb4 Re8 25. Qf2 a5 26. Bd2 Qd6 27. Qh4 Nd7 28. Bf4 Qf6 29. Qxf6 Nxf6 30. Bc7 a4 31. Bxb6 Rb8 32. c5 h5 33. Bc2 h4 34. Rxd4 h3 35. gxh3 Bxf3 36. Bxa4 Be4+ 37. Kc1 g5 38. Bd8 Kg7 39. Bxf6+ Kxf6 40. Rxe4 1-0`
  },
  {
    name: "Tactical Puzzle: Greek Gift Sacrifice",
    description: "A specific opening puzzle position focusing on the classic Bishop sacrifice on h7.",
    fen: "r1bqk2r/ppp1bppp/2n1pn2/3p2B1/3P4/2NBP3/PPP2PPP/R2QK1NR w KQkq - 3 6"
  }
];

// Parses PGN tags to extract metadata
export function parsePgnMetadata(pgn: string): GameMetadata {
  const metadata: GameMetadata = {
    white: { name: "White Player" },
    black: { name: "Black Player" },
  };

  const tagRegex = /\[(\w+)\s+"([^"]+)"\]/g;
  let match;
  while ((match = tagRegex.exec(pgn)) !== null) {
    const key = match[1].toLowerCase();
    const val = match[2];

    switch (key) {
      case "event":
        metadata.event = val;
        break;
      case "site":
        metadata.site = val;
        break;
      case "date":
        metadata.date = val;
        break;
      case "round":
        metadata.round = val;
        break;
      case "white":
        metadata.white.name = val;
        break;
      case "black":
        metadata.black.name = val;
        break;
      case "result":
        metadata.result = val;
        break;
      case "opening":
        metadata.opening = val;
        break;
    }
  }

  // Look for any standard Chess.com or Lichess rating tags
  const whiteRatingMatch = pgn.match(/\[WhiteElo\s+"(\d+)"\]/i);
  if (whiteRatingMatch) {
    metadata.white.rating = whiteRatingMatch[1];
  }
  const blackRatingMatch = pgn.match(/\[BlackElo\s+"(\d+)"\]/i);
  if (blackRatingMatch) {
    metadata.black.rating = blackRatingMatch[1];
  }

  return metadata;
}

// Converts a PGN into chronological move listing with pre/post FEN states
export function parsePgnMoves(pgn: string): AnalysisMove[] {
  const chess = new Chess();
  try {
    chess.loadPgn(pgn);
  } catch (err) {
    console.error("Failed to parse PGN moves with chess.js:", err);
    return [];
  }

  const movesFromHistory = chess.history({ verbose: true });
  const result: AnalysisMove[] = [];

  movesFromHistory.forEach((move) => {
    result.push({
      san: move.san,
      uci: move.lan || `${move.from}${move.to}`,
      fenBefore: move.before,
      fenAfter: move.after,
    });
  });

  return result;
}

// Helper to convert a centipawn score to a win probability (using standard Chess.com sigmoid model)
export function getWinProbability(score: number): number {
  // Clamp for numerical stability (from perspective of active player)
  const clamped = Math.max(-10000, Math.min(10000, score));
  return 1 / (1 + Math.exp(-0.00368208 * clamped));
}

// Map numerical centipawns or absolute evaluations into Chess.com style accuracy stats
export function evaluateReports(moves: AnalysisMove[]): GameReport {
  let whiteAccuracyTotal = 0;
  let blackAccuracyTotal = 0;
  let whiteMoveCount = 0;
  let blackMoveCount = 0;

  const whiteStats: Record<MoveClassification, number> = {
    book: 0, brilliant: 0, great: 0, best: 0, excellent: 0, good: 0, miss: 0, inaccuracy: 0, mistake: 0, blunder: 0
  };
  const blackStats: Record<MoveClassification, number> = {
    book: 0, brilliant: 0, great: 0, best: 0, excellent: 0, good: 0, miss: 0, inaccuracy: 0, mistake: 0, blunder: 0
  };

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const isWhite = i % 2 === 0;
    const classification = move.classification || "good";

    // Set analytics counters
    if (isWhite) {
      whiteStats[classification]++;
      whiteMoveCount++;
    } else {
      blackStats[classification]++;
      blackMoveCount++;
    }

    // Get exact score before and after to compute win-probability loss
    const scoreBefore = i === 0 ? 0 : (moves[i - 1].evaluation?.numericScore || 0);
    const scoreAfter = move.evaluation?.numericScore || 0;

    const scoreBeforePlayer = isWhite ? scoreBefore : -scoreBefore;
    const scoreAfterPlayer = isWhite ? scoreAfter : -scoreAfter;

    const pBefore = getWinProbability(scoreBeforePlayer);
    const pAfter = getWinProbability(scoreAfterPlayer);
    const probLoss = Math.max(0, pBefore - pAfter);

    // Calculate precision single-move accuracy
    let singleMoveCPAccuracy = 100;
    if (classification === "book") singleMoveCPAccuracy = 100;
    else if (classification === "brilliant") singleMoveCPAccuracy = 100;
    else if (classification === "great") singleMoveCPAccuracy = 100;
    else if (classification === "best") singleMoveCPAccuracy = 100;
    else if (classification === "excellent") singleMoveCPAccuracy = 95;
    else if (classification === "good") singleMoveCPAccuracy = 88;
    else {
      // Scale decay using the win probability loss
      const baseAcc = Math.round(100 * Math.pow(1 - probLoss, 2));
      if (classification === "inaccuracy") singleMoveCPAccuracy = Math.max(70, Math.min(84, baseAcc));
      else if (classification === "mistake") singleMoveCPAccuracy = Math.max(45, Math.min(69, baseAcc));
      else if (classification === "miss") singleMoveCPAccuracy = Math.max(30, Math.min(44, baseAcc));
      else if (classification === "blunder") singleMoveCPAccuracy = Math.max(10, Math.min(29, baseAcc));
    }

    if (isWhite) {
      whiteAccuracyTotal += singleMoveCPAccuracy;
    } else {
      blackAccuracyTotal += singleMoveCPAccuracy;
    }
  }

  return {
    whiteAccuracy: whiteMoveCount > 0 ? Math.round(whiteAccuracyTotal / whiteMoveCount) : 100,
    blackAccuracy: blackMoveCount > 0 ? Math.round(blackAccuracyTotal / blackMoveCount) : 100,
    whiteStats,
    blackStats
  };
}

// Helper to check for a piece sacrifice
const PIECE_VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 1000 };

function isSquareDefended(chess: Chess, square: string, color: "w" | "b"): boolean {
  const colIdx = square.charCodeAt(0) - 97; // 'a' is 97
  const rowIdx = square.charCodeAt(1) - 49; // '1' is 49
  
  // Pawns
  const pawnRowDirection = color === "w" ? -1 : 1;
  const pawnRow = rowIdx + pawnRowDirection;
  for (const dc of [-1, 1]) {
    const pawnCol = colIdx + dc;
    if (pawnCol >= 0 && pawnCol < 8 && pawnRow >= 0 && pawnRow < 8) {
      const sq = String.fromCharCode(97 + pawnCol) + String.fromCharCode(49 + pawnRow);
      const p = chess.get(sq as any);
      if (p && p.type === "p" && p.color === color) return true;
    }
  }

  // Knights
  const knightOffsets = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1]
  ];
  for (const [dr, dc] of knightOffsets) {
    const r = rowIdx + dr;
    const c = colIdx + dc;
    if (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const sq = String.fromCharCode(97 + c) + String.fromCharCode(49 + r);
      const p = chess.get(sq as any);
      if (p && p.type === "n" && p.color === color) return true;
    }
  }

  // Sliding pieces (Bishops, Rooks, Queens)
  const directions = [
    { dr: 1, dc: 1, types: ["b", "q"] },
    { dr: 1, dc: -1, types: ["b", "q"] },
    { dr: -1, dc: 1, types: ["b", "q"] },
    { dr: -1, dc: -1, types: ["b", "q"] },
    { dr: 1, dc: 0, types: ["r", "q"] },
    { dr: -1, dc: 0, types: ["r", "q"] },
    { dr: 0, dc: 1, types: ["r", "q"] },
    { dr: 0, dc: -1, types: ["r", "q"] },
  ];
  for (const { dr, dc, types } of directions) {
    let r = rowIdx + dr;
    let c = colIdx + dc;
    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const sq = String.fromCharCode(97 + c) + String.fromCharCode(49 + r);
      const p = chess.get(sq as any);
      if (p) {
        if (p.color === color && types.includes(p.type)) {
          return true;
        }
        break; // Blocked by any piece
      }
      r += dr;
      c += dc;
    }
  }

  // King
  const kingOffsets = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];
  for (const [dr, dc] of kingOffsets) {
    const r = rowIdx + dr;
    const c = colIdx + dc;
    if (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const sq = String.fromCharCode(97 + c) + String.fromCharCode(49 + r);
      const p = chess.get(sq as any);
      if (p && p.type === "k" && p.color === color) return true;
    }
  }

  return false;
}

function isSacrifice(fenBefore?: string, uci?: string): boolean {
  if (!fenBefore || !uci) return false;
  try {
    const chess = new Chess(fenBefore);
    const fromSquare = uci.slice(0, 2);
    const piece = chess.get(fromSquare as any);
    if (!piece || piece.type === "p") {
      // Pawns are not considered major/minor piece sacrifices
      return false;
    }
    
    const toSquare = uci.slice(2, 4);
    const pieceValue = PIECE_VALUES[piece.type] || 0;
    
    // Execute the move
    const moved = chess.move({
      from: fromSquare,
      to: toSquare,
      promotion: uci.length > 4 ? uci.charAt(4) : undefined
    });
    
    if (!moved) return false;
    
    // Find if the opponent has any legal move that captures the piece on toSquare
    const opponentMoves = chess.moves({ verbose: true });
    const capturingMoves = opponentMoves.filter(m => m.to === toSquare);
    
    if (capturingMoves.length === 0) {
      return false;
    }
    
    // Check if the target is defended by us
    const isDefended = isSquareDefended(chess, toSquare, piece.color);
    
    // If undefended, and any opponent piece can capture it, it's a sacrifice
    if (!isDefended) {
      return true;
    }
    
    // If defended, check if an opponent piece of lower value can capture it
    for (const m of capturingMoves) {
      const capturer = chess.get(m.from);
      if (capturer) {
        const capturerValue = PIECE_VALUES[capturer.type] || 0;
        if (capturerValue < pieceValue) {
          return true;
        }
      }
    }
    
    return false;
  } catch (e) {
    return false;
  }
}

// Classify a specific played move vs engine recommendation based on Chess.com Game Review system
export function classifyMove(
  moveNumber: number,
  playedUci: string,
  bestUci: string | undefined,
  scoreBefore: number, // normalised (white perspective)
  scoreAfter: number,  // normalised (white perspective)
  isWhite: boolean,
  fenBefore?: string,
  san?: string
): MoveClassification {
  const scoreBeforePlayer = isWhite ? scoreBefore : -scoreBefore;
  const scoreAfterPlayer = isWhite ? scoreAfter : -scoreAfter;

  const pBefore = getWinProbability(scoreBeforePlayer);
  const pAfter = getWinProbability(scoreAfterPlayer);
  const probLoss = Math.max(0, pBefore - pAfter);

  // 1. Opening Book Check
  // "Alternatively, the lightweight approach: run Stockfish but tag any move played in the first 8 moves where the engine eval is between -30 and +30 cp as "book" (near-equal positions in theory are almost always book). Also look at if the move matches a known opening or starts the game."
  const isOpeningBook = (moveNumber <= 8 && Math.abs(scoreBefore) <= 30 && Math.abs(scoreAfter) <= 30) || (moveNumber <= 10 && probLoss <= 0.015);
  if (isOpeningBook) {
    return "book";
  }

  // 2. Miss Check: You had forced mate; didn't play it
  // "Stockfish finds a forced mate (#N) at the position before the move. The player did not play that forced mate line. Classify as "miss" regardless of whether the move they played was otherwise reasonable."
  // Note: forced mate is indicated by scoreBeforePlayer >= 9000 (e.g., 10000)
  const missedMate = (scoreBeforePlayer >= 9000) && (scoreAfterPlayer < 9000);
  if (missedMate) {
    return "miss";
  }

  // 3. Forced Checkmate found and played
  const isMate = (san?.endsWith("#") || scoreAfterPlayer >= 9999);
  if (isMate) {
    return "best";
  }

  // Convert win probabilities to percentages (0 - 100)
  const wpBest = pBefore * 100;
  const wpPlayed = pAfter * 100;
  let wpDrop = Math.max(0, wpBest - wpPlayed);

  // 4. Already-losing positions
  // "When you're already down significantly (e.g. -400 cp), even a blunder doesn't drop the win% much because you were already at ~20%. Chess.com reduces the severity of errors in technically-lost positions. A pragmatic rule: if cpToWinPct(prevCp) < 20% (already losing badly), apply a 0.5× multiplier to your threshold comparisons."
  // Note: cpToWinPct(prevCp) is pBefore * 100.
  if (wpBest < 20) {
    wpDrop = wpDrop * 0.5;
  }

  const isTopMove = playedUci === bestUci || scoreAfterPlayer >= scoreBeforePlayer - 5;
  const isSac = isSacrifice(fenBefore, playedUci);

  // 5. Brilliant Move (!!)
  // "Brilliant (!!) — Chess.com's most complex classification. All of these must be true: the move involves giving up material (sacrifice), it is the engine's top choice, there is a clear next-best alternative that loses significantly, and it is non-forced."
  if (isTopMove && isSac) {
    return "brilliant";
  }

  // 6. Great Move (!)
  const isClutchSave = isTopMove && (pBefore < 0.40 && pAfter >= 0.52);
  const isHugeGainer = isTopMove && (pAfter - pBefore >= 0.10);
  const isTacticalGreat = isTopMove && (
    (pAfter >= 0.65 && pBefore < 0.60 && (san?.includes("x") || san?.includes("+")))
  );
  if (isClutchSave || isHugeGainer || isTacticalGreat) {
    return "great";
  }

  // 7. Best Move (★)
  const isBestMove = isTopMove || wpDrop <= 2;
  if (isBestMove) {
    return "best";
  }

  // 8. Normal scales based on win% drop
  if (wpDrop <= 5) return "excellent";
  if (wpDrop <= 10) return "good";
  if (wpDrop <= 20) return "inaccuracy";
  if (wpDrop <= 35) return "mistake";

  return "blunder";
}
