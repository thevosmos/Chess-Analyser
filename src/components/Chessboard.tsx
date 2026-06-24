import React, { useState, useEffect } from "react";
import { Chess, Square } from "chess.js";
import { motion, AnimatePresence } from "motion/react";
import { MoveClassification } from "../types";

// Wikimedia SVG URLs for beautifully rendered chess pieces
export const getPieceSvg = (type: string, color: string): string => {
  const isWhite = color === "w";
  switch (type) {
    case "k":
      return isWhite
        ? "https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg"
        : "https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg";
    case "q":
      return isWhite
        ? "https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg"
        : "https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg";
    case "r":
      return isWhite
        ? "https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg"
        : "https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg";
    case "b":
      return isWhite
        ? "https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg"
        : "https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg";
    case "n":
      return isWhite
        ? "https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg"
        : "https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg";
    case "p":
      return isWhite
        ? "https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg"
        : "https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg";
    default:
      return "";
  }
};

interface ChessboardProps {
  fen: string;
  perspective: "w" | "b";
  interactive: boolean;
  onMove: (from: string, to: string, promotion?: string) => void;
  lastMove?: { from: string; to: string };
  lastMoveClassification?: MoveClassification;
  bestMoveHint?: string; // Best move UCI string (e.g. "e2e4")
  boardTheme: "wood" | "forest" | "blue" | "slate" | "gambit" | "custom";
  customColors?: { light: string; dark: string };
}

const THEMES = {
  gambit: { light: "bg-[#eae6d1] text-[#558460]", dark: "bg-[#558460] text-[#eae6d1]" },
  forest: { light: "bg-[#eeeed2] text-[#769656]", dark: "bg-[#769656] text-[#eeeed2]" },
  wood: { light: "bg-[#f0d9b5] text-[#b58863]", dark: "bg-[#b58863] text-[#f0d9b5]" },
  blue: { light: "bg-[#dee3e6] text-[#4b7399]", dark: "bg-[#4b7399] text-[#dee3e6]" },
  slate: { light: "bg-[#e2e8f0] text-[#64748b]", dark: "bg-[#64748b] text-[#e2e8f0]" },
};

// Helpers to track pieces and assign stable IDs
const squareToCoords = (square: string) => {
  if (!square || square.length < 2) return { x: 0, y: 0 };
  const file = square.charCodeAt(0) - 97; // 'a' is 97
  const rank = parseInt(square[1]) - 1;
  return { x: isNaN(file) ? 0 : file, y: isNaN(rank) ? 0 : rank };
};

const getChebyshevDistance = (sq1: string, sq2: string) => {
  const c1 = squareToCoords(sq1);
  const c2 = squareToCoords(sq2);
  return Math.max(Math.abs(c1.x - c2.x), Math.abs(c1.y - c2.y));
};

export default function Chessboard({
  fen,
  perspective = "w",
  interactive = true,
  onMove,
  lastMove,
  lastMoveClassification,
  bestMoveHint,
  boardTheme = "gambit",
  customColors,
}: ChessboardProps) {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);
  const [promotionPending, setPromotionPending] = useState<{ from: string; to: string } | null>(null);
  const [draggedOverSquare, setDraggedOverSquare] = useState<Square | null>(null);
  const [draggedFromSquare, setDraggedFromSquare] = useState<Square | null>(null);
  const [splash, setSplash] = useState<{ text: string; colorClass: string; icon: string; sub: string } | null>(null);

  // Parse FEN and represent board
  const [chessInstance, setChessInstance] = useState(() => new Chess(fen));

  // Stable piece keys across FEN states
  const [pieceIds, setPieceIds] = useState<Record<string, string>>({});
  const prevPiecesRef = React.useRef<{ id: string; type: string; color: string; square: string }[]>([]);

  useEffect(() => {
    try {
      const nextChess = new Chess(fen);
      setChessInstance(nextChess);
    } catch (e) {
      console.warn("Invalid FEN passed to chessboard:", fen, e);
    }
    setSelectedSquare(null);
    setLegalMoves([]);
    setPromotionPending(null);
    setDraggedOverSquare(null);
  }, [fen]);

  // Track active pieces and match them between transitions dynamically
  useEffect(() => {
    const currentPieces: { type: string; color: string; square: string }[] = [];
    try {
      chessInstance.board().forEach((row) => {
        row.forEach((squareInfo) => {
          if (squareInfo) {
            currentPieces.push({
              type: squareInfo.type,
              color: squareInfo.color,
              square: squareInfo.square,
            });
          }
        });
      });
    } catch (err) {
      return;
    }

    const prevPieces = prevPiecesRef.current;
    
    if (prevPieces.length === 0) {
      const bootstrapIds: Record<string, string> = {};
      const bootstrapPieces: typeof prevPieces = [];
      currentPieces.forEach((p, idx) => {
        const id = `piece-${p.color}${p.type}-${idx}`;
        bootstrapIds[p.square] = id;
        bootstrapPieces.push({ ...p, id });
      });
      setPieceIds(bootstrapIds);
      prevPiecesRef.current = bootstrapPieces;
      return;
    }

    const matchedNewPieces: { id: string; type: string; color: string; square: string }[] = [];
    const nextPieceIds: Record<string, string> = {};

    const prevGroups: Record<string, typeof prevPieces> = {};
    const currentGroups: Record<string, typeof currentPieces> = {};

    prevPieces.forEach((p) => {
      const key = `${p.color}${p.type}`;
      if (!prevGroups[key]) prevGroups[key] = [];
      prevGroups[key].push(p);
    });

    currentPieces.forEach((p) => {
      const key = `${p.color}${p.type}`;
      if (!currentGroups[key]) currentGroups[key] = [];
      currentGroups[key].push(p);
    });

    let counter = 0;

    const allSignatures = new Set([...Object.keys(prevGroups), ...Object.keys(currentGroups)]);
    allSignatures.forEach((sig) => {
      const prevList = prevGroups[sig] || [];
      const currentList = currentGroups[sig] || [];

      interface MatchPair {
        pIdx: number;
        cIdx: number;
        dist: number;
      }
      const pairs: MatchPair[] = [];
      for (let pIdx = 0; pIdx < prevList.length; pIdx++) {
        for (let cIdx = 0; cIdx < currentList.length; cIdx++) {
          const p = prevList[pIdx];
          const c = currentList[cIdx];
          pairs.push({
            pIdx,
            cIdx,
            dist: getChebyshevDistance(p.square, c.square),
          });
        }
      }

      pairs.sort((a, b) => a.dist - b.dist);

      const matchedPrev = new Set<number>();
      const matchedCurrent = new Set<number>();

      pairs.forEach((pair) => {
        if (!matchedPrev.has(pair.pIdx) && !matchedCurrent.has(pair.cIdx)) {
          matchedPrev.add(pair.pIdx);
          matchedCurrent.add(pair.cIdx);
          const pPiece = prevList[pair.pIdx];
          const cPiece = currentList[pair.cIdx];

          matchedNewPieces.push({
            id: pPiece.id,
            type: cPiece.type,
            color: cPiece.color,
            square: cPiece.square,
          });
          nextPieceIds[cPiece.square] = pPiece.id;
        }
      });

      currentList.forEach((cPiece, cIdx) => {
        if (!matchedCurrent.has(cIdx)) {
          const id = `piece-${sig}-${Date.now()}-${counter++}`;
          matchedNewPieces.push({
            id,
            type: cPiece.type,
            color: cPiece.color,
            square: cPiece.square,
          });
          nextPieceIds[cPiece.square] = id;
        }
      });
    });

    setPieceIds(nextPieceIds);
    prevPiecesRef.current = matchedNewPieces;
  }, [fen, chessInstance]);

  // No active full-screen splash effects are triggered, keeping gameplay smooth and uninterrupted
  useEffect(() => {
    // Splash removed to only show tier badges directly over individual pieces
  }, [lastMove, lastMoveClassification]);

  const themeColors = THEMES[boardTheme] || THEMES.gambit;

  const isCheckmate = chessInstance.isGameOver() && (typeof chessInstance.isCheckmate === "function" ? chessInstance.isCheckmate() : (chessInstance as any).in_checkmate?.());

  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"];

  // Reorder ranks/files based on player perspective
  const displayRanks = perspective === "w" ? ranks : [...ranks].reverse();
  const displayFiles = perspective === "w" ? files : [...files].reverse();

  const handleSquareClick = (square: Square) => {
    if (!interactive) return;

    // If a pawn promotion is pending, block interactions
    if (promotionPending) return;

    if (selectedSquare === square) {
      // Toggle selection off
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    const piece = chessInstance.get(square);

    // If clicking a friendly piece, select it and show legal moves
    if (piece && piece.color === chessInstance.turn()) {
      setSelectedSquare(square);
      const moves = chessInstance.moves({ square, verbose: true });
      setLegalMoves(moves.map((m) => m.to as Square));
      return;
    }

    // Try executing move if a square was already selected
    if (selectedSquare) {
      if (legalMoves.includes(square)) {
        // Check for promotion condition: moving a pawn to back ranks
        const activePiece = chessInstance.get(selectedSquare);
        const isPawnPromotion =
          activePiece?.type === "p" &&
          ((activePiece.color === "w" && square[1] === "8") ||
            (activePiece.color === "b" && square[1] === "1"));

        if (isPawnPromotion) {
          setPromotionPending({ from: selectedSquare, to: square });
        } else {
          onMove(selectedSquare, square);
          setSelectedSquare(null);
          setLegalMoves([]);
        }
      } else {
        // Clicked invalid square, reset selection
        setSelectedSquare(null);
        setLegalMoves([]);
      }
    }
  };

  // Touch support for dragging & tapping on mobile devices
  const handleTouchStart = (e: React.TouchEvent, square: Square) => {
    if (!interactive || promotionPending) return;
    
    setSelectedSquare(square);
    const piece = chessInstance.get(square);
    if (piece && piece.color === chessInstance.turn()) {
      const moves = chessInstance.moves({ square, verbose: true });
      setLegalMoves(moves.map((m) => m.to as Square));
    } else {
      setLegalMoves([]);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent, fromSquare: Square) => {
    if (!interactive || promotionPending) return;
    
    const touch = e.changedTouches[0];
    if (!touch) return;

    // Find what element was touched at coordinates
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!element) {
      setLegalMoves([]);
      return;
    }

    // Find the closest parent square element
    const squareEl = element.closest("[id^='square-']");
    if (squareEl) {
      const targetSquareStr = squareEl.id.replace("square-", "") as Square;
      if (legalMoves.includes(targetSquareStr)) {
        // Execute movement
        const activePiece = chessInstance.get(fromSquare);
        const isPawnPromotion =
          activePiece?.type === "p" &&
          ((activePiece.color === "w" && targetSquareStr[1] === "8") ||
            (activePiece.color === "b" && targetSquareStr[1] === "1"));

        if (isPawnPromotion) {
          setPromotionPending({ from: fromSquare, to: targetSquareStr });
        } else {
          onMove(fromSquare, targetSquareStr);
          setSelectedSquare(null);
          setLegalMoves([]);
        }
      } else {
        // If they just tapped, keep selection active for two-tap click-to-move
        if (targetSquareStr === fromSquare) {
          // Stay selected
        } else {
          setSelectedSquare(null);
          setLegalMoves([]);
        }
      }
    } else {
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  };

  const handlePromotionSelect = (pieceCode: string) => {
    if (promotionPending) {
      onMove(promotionPending.from, promotionPending.to, pieceCode);
      setPromotionPending(null);
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  };

  // Helper to render beautiful annotation badges based on classification
  const renderClassificationBadge = (square: Square) => {
    if (!lastMove || lastMove.to !== square || !lastMoveClassification) return null;

    const badgeVariants = {
      initial: { scale: 0, rotate: -20, opacity: 0 },
      animate: { scale: 1, rotate: 0, opacity: 1, transition: { type: "spring", stiffness: 350, damping: 15 } },
    };

    switch (lastMoveClassification) {
      case "brilliant":
        return (
          <motion.div
            variants={badgeVariants}
            initial="initial"
            animate="animate"
            className="absolute -top-1 -right-1 z-30 flex items-center justify-center w-6 h-6 rounded-full bg-[#12b6a6] border-2 border-slate-900 shadow-[0_0_12px_rgba(18,182,166,0.8)] filter drop-shadow font-bold text-white font-sans"
            title="Brilliant Move!!"
          >
            <span className="text-[11px] font-black leading-none select-none tracking-tighter">!!</span>
          </motion.div>
        );
      case "great":
        return (
          <motion.div
            variants={badgeVariants}
            initial="initial"
            animate="animate"
            className="absolute -top-1 -right-1 z-30 flex items-center justify-center w-6 h-6 rounded-full bg-[#1b9af7] border-2 border-slate-900 shadow-[0_0_10px_rgba(27,154,247,0.7)] filter drop-shadow font-semibold text-white font-sans"
            title="Great Move!"
          >
            <span className="text-xs font-black leading-none select-none">!</span>
          </motion.div>
        );
      case "book":
        return (
          <motion.div
            variants={badgeVariants}
            initial="initial"
            animate="animate"
            className="absolute -top-1 -right-1 z-30 flex items-center justify-center w-5 h-5 rounded-full bg-[#a5743f] border-2 border-slate-950 shadow-md font-sans text-white text-[10px]"
            title="Book Move"
          >
            <span className="leading-none text-[10px]">📖</span>
          </motion.div>
        );
      case "best":
        return (
          <motion.div
            variants={badgeVariants}
            initial="initial"
            animate="animate"
            className="absolute -top-1 -right-1 z-30 flex items-center justify-center w-5 h-5 rounded-full bg-[#81b64c] border-2 border-slate-950 shadow-md"
            title="Best Move"
          >
            <span className="text-white text-[11px] font-sans -mt-0.5 leading-none">★</span>
          </motion.div>
        );
      case "excellent":
        return (
          <motion.div
            variants={badgeVariants}
            initial="initial"
            animate="animate"
            className="absolute -top-1 -right-1 z-30 flex items-center justify-center w-5 h-5 rounded-full bg-[#85c441] border border-slate-950 shadow-sm"
            title="Excellent Move"
          >
            <span className="text-white text-[9px] leading-none">👍</span>
          </motion.div>
        );
      case "good":
        return (
          <motion.div
            variants={badgeVariants}
            initial="initial"
            animate="animate"
            className="absolute -top-1 -right-1 z-30 flex items-center justify-center w-4 h-4 rounded-full bg-[#36b37e] border border-slate-950 shadow-sm"
            title="Good Move"
          >
            <span className="text-white text-[10px] font-bold leading-none">✓</span>
          </motion.div>
        );
      case "inaccuracy":
        return (
          <motion.div
            variants={badgeVariants}
            initial="initial"
            animate="animate"
            className="absolute -top-1 -right-1 z-30 flex items-center justify-center w-5 h-5 rounded-full bg-[#f5cb35] border border-slate-950 shadow animate-pulse"
            title="Inaccuracy"
          >
            <span className="text-[10px] font-extrabold text-white font-serif -mt-0.5 select-none">?!</span>
          </motion.div>
        );
      case "mistake":
        return (
          <motion.div
            variants={badgeVariants}
            initial="initial"
            animate="animate"
            className="absolute -top-1 -right-1 z-30 flex items-center justify-center w-5 h-5 rounded-full bg-[#e28743] border-2 border-slate-950 shadow"
            title="Mistake"
          >
            <span className="text-xs font-black text-white font-serif -mt-0.5 select-none">?</span>
          </motion.div>
        );
      case "blunder":
        return (
          <motion.div
            variants={badgeVariants}
            initial="initial"
            animate="animate"
            className="absolute -top-1 -right-1 z-30 flex items-center justify-center w-6 h-6 rounded-full bg-[#ef4444] border-2 border-slate-950 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-bounce font-serif text-white font-sans"
            title="Blunder??"
          >
            <span className="text-xs font-black leading-none select-none tracking-tighter">??</span>
          </motion.div>
        );
      case "miss":
        return (
          <motion.div
            variants={badgeVariants}
            initial="initial"
            animate="animate"
            className="absolute -top-1 -right-1 z-30 flex items-center justify-center w-5 h-5 rounded-full bg-[#db4c44] border-2 border-slate-950 shadow-[0_0_8px_rgba(219,76,68,0.8)] font-sans text-white"
            title="Missed Chance"
          >
            <span className="text-xs font-black leading-none select-none">✕</span>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative w-full aspect-square max-w-[560px] mx-auto select-none shadow-2xl rounded-2xl overflow-hidden border-2 border-slate-800/80 bg-slate-950 ring-1 ring-slate-800/50">
      <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
        {displayRanks.map((rank, rIdx) =>
          displayFiles.map((file, fIdx) => {
            const square = `${file}${rank}` as Square;
            const isLight = (parseInt(rank) + files.indexOf(file)) % 2 !== 0;
            const piece = chessInstance.get(square);

            // Styling variables
            const isLastMoveFrom = lastMove?.from === square;
            const isLastMoveTo = lastMove?.to === square;
            const isSelected = selectedSquare === square;
            const isLegalDest = legalMoves.includes(square);
            const isKingInCheck =
              piece?.type === "k" &&
              piece.color === chessInstance.turn() &&
              chessInstance.inCheck();

            // Best move arrows / subtle borders
            const isBestMoveFrom = bestMoveHint?.substring(0, 2) === square;
            const isBestMoveTo = bestMoveHint?.substring(2, 4) === square;

            const isCustom = boardTheme === "custom" && !!customColors;
            const bgColor = isCustom
              ? ""
              : (isLight ? themeColors.light : themeColors.dark);
            const customSquareStyle = isCustom
              ? { backgroundColor: isLight ? customColors.light : customColors.dark }
              : undefined;

            // Highlight overlays
            let overlayClass = "";
            if (isSelected) {
              overlayClass = "bg-[#fcd34d]/35 ring-4 ring-[#fbd34d] ring-inset z-10";
            } else if (isLastMoveFrom || isLastMoveTo) {
              overlayClass = "bg-[#a3e635]/20 shadow-inner z-10";
            } else if (isBestMoveFrom || isBestMoveTo) {
              overlayClass = "bg-[#06b6d4]/20 shadow-inner z-10";
            } else if (isKingInCheck) {
              overlayClass = "bg-rose-600/40 animate-pulse ring-4 ring-rose-500 ring-inset z-10";
            } else if (draggedOverSquare === square && isLegalDest) {
              overlayClass = "bg-[#10b981]/25 ring-2 ring-[#10b981] ring-inset z-10 animate-pulse";
            }

            return (
              <div
                key={square}
                id={`square-${square}`}
                className={`relative flex items-center justify-center cursor-pointer transition-all duration-150 ${bgColor}`}
                style={customSquareStyle}
                onClick={() => handleSquareClick(square)}
                onTouchStart={(e) => {
                  if (!interactive || promotionPending) return;
                  e.preventDefault(); // blocks mouse click emulation to avoid double triggers
                  handleSquareClick(square);
                }}
                onDragOver={(e) => {
                  if (interactive && !promotionPending) {
                    e.preventDefault();
                    if (isLegalDest && draggedOverSquare !== square) {
                      setDraggedOverSquare(square);
                    }
                  }
                }}
                onDragLeave={() => {
                  if (draggedOverSquare === square) {
                    setDraggedOverSquare(null);
                  }
                }}
                onDrop={(e) => {
                  if (!interactive || promotionPending) return;
                  e.preventDefault();
                  setDraggedOverSquare(null);
                  
                  // Read from dataTransfer with fallback to React state for iframe sandboxes
                  let fromSquare = e.dataTransfer.getData("text/plain") as Square;
                  if (!fromSquare) {
                    fromSquare = draggedFromSquare as Square;
                  }
                  
                  if (fromSquare && fromSquare !== square && legalMoves.includes(square)) {
                    const activePiece = chessInstance.get(fromSquare);
                    const isPawnPromotion =
                      activePiece?.type === "p" &&
                      ((activePiece.color === "w" && square[1] === "8") ||
                        (activePiece.color === "b" && square[1] === "1"));

                    if (isPawnPromotion) {
                      setPromotionPending({ from: fromSquare, to: square });
                    } else {
                      onMove(fromSquare, square);
                      setSelectedSquare(null);
                      setLegalMoves([]);
                    }
                  }
                  setDraggedFromSquare(null);
                }}
              >
                {/* Visual coordinate labels (only on file a and rank 1) */}
                {fIdx === 0 && (
                  <span className={`absolute top-1 left-1.5 text-[10px] font-mono font-bold leading-none ${isLight ? "text-slate-500" : "text-amber-100/60"}`}>
                    {rank}
                  </span>
                )}
                {rIdx === 7 && (
                  <span className={`absolute bottom-1 right-1.5 text-[10px] font-mono font-bold leading-none ${isLight ? "text-slate-500" : "text-amber-100/60"}`}>
                    {file}
                  </span>
                )}

                {/* Selection and state indicator overlays */}
                {overlayClass && <div className={`absolute inset-0 ${overlayClass}`} />}

                {/* Best move target indicator */}
                {isBestMoveTo && (
                  <div className="absolute top-2.5 right-2.5 flex h-3.5 w-3.5 z-20">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-cyan-500"></span>
                  </div>
                )}

                {/* Legal destination indicator dot */}
                {isLegalDest && !piece && (
                  <div className="absolute w-5 h-5 rounded-full bg-[#10b981]/40 border border-[#10b981]/30 backdrop-blur-[1px] z-20 animate-pulse hover:scale-125 transition" />
                )}
                {isLegalDest && piece && (
                  <div className="absolute w-12 h-12 border-[3.5px] border-[#ef4444]/65 rounded-full z-20 animate-pulse" />
                )}

                {/* Floating Crown over King during Checkmate conditions */}
                {isKingInCheck && chessInstance.isGameOver() && (
                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                    className="absolute -top-3 z-30 text-yellow-400 text-lg filter drop-shadow-[0_2px_5px_rgba(251,191,36,0.8)]"
                  >
                    👑
                  </motion.div>
                )}

                {/* Classification Badge overlay */}
                {renderClassificationBadge(square)}

                {/* Piece rendering */}
                {piece && (
                  <motion.img
                    layoutId={pieceIds[square] || `piece-${square}`}
                    transition={{
                      type: "spring",
                      stiffness: 280,
                      damping: 26,
                    }}
                    id={`piece-${square}-${piece.color}${piece.type}`}
                    src={getPieceSvg(piece.type, piece.color)}
                    alt={`${piece.color === "w" ? "White" : "Black"} ${piece.type}`}
                    className="relative w-[90%] h-[90%] object-contain select-none z-10 hover:scale-105 active:scale-95 transition-transform duration-150 touch-none"
                    draggable={interactive && !promotionPending}
                    onDragStart={(e) => {
                      if (!interactive || promotionPending) return;
                      setSelectedSquare(square);
                      setDraggedFromSquare(square); // backup state store
                      const moves = chessInstance.moves({ square, verbose: true });
                      setLegalMoves(moves.map((m) => m.to as Square));
                      e.dataTransfer.setData("text/plain", square);
                    }}
                    onDragEnd={() => {
                      setDraggedFromSquare(null);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onTouchStart={(e) => handleTouchStart(e, square)}
                    onTouchEnd={(e) => handleTouchEnd(e, square)}
                  />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pawn Promotion Dialog Overlay */}
      {promotionPending && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center z-50 p-4 transition-all animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center max-w-sm ring-1 ring-emerald-500/20">
            <h3 className="text-white font-sans font-bold tracking-tight text-xl mb-2 flex items-center gap-2 justify-center">
              <span className="text-emerald-400 animate-bounce">👑</span>
              Pawn Promotion
            </h3>
            <p className="text-slate-400 text-xs mb-5">
              Select the optimal promotion piece for your crowning pawn:
            </p>
            <div className="grid grid-cols-4 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
              {["q", "r", "b", "n"].map((role) => {
                const turnColor = chessInstance.turn();
                return (
                  <button
                    key={role}
                    id={`promote-${role}`}
                    className="flex flex-col items-center p-2 rounded-xl hover:bg-slate-900 border border-transparent hover:border-slate-800 hover:shadow-md transition active:scale-90"
                    onClick={() => handlePromotionSelect(role)}
                  >
                    <img
                      src={getPieceSvg(role, turnColor)}
                      alt={role === "q" ? "Queen" : role === "r" ? "Rook" : role === "b" ? "Bishop" : "Knight"}
                      className="w-12 h-12"
                    />
                    <span className="text-[9px] font-mono font-bold text-slate-400 mt-1 uppercase tracking-tight">
                      {role === "q" ? "QUEEN" : role === "r" ? "ROOK" : role === "b" ? "BISHOP" : "KNIGHT"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 4. SPLASH OVERLAYS (Brilliant, Great, Blunder, Good moves) */}
      <AnimatePresence>
        {splash && (
          <motion.div
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1, y: -20 }}
            className="absolute inset-0 z-40 bg-slate-950/75 flex flex-col items-center justify-center p-6 backdrop-blur-[2px]"
          >
            <motion.div
              initial={{ rotate: -15, y: 10 }}
              animate={{ rotate: 0, y: 0 }}
              exit={{ scale: 0.8 }}
              className={`bg-gradient-to-tr ${splash.colorClass} border border-white/20 p-6 rounded-3xl text-center flex flex-col items-center max-w-xs relative overflow-hidden`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[pulse_2s_infinite] pointer-events-none" />
              <span className="text-4xl filter drop-shadow-lg mb-3">
                {splash.icon}
              </span>
              <h2 className="text-xl font-black text-white tracking-widest uppercase font-sans leading-none pb-1">
                {splash.text}
              </h2>
              <p className="text-[11px] text-white/90 font-mono font-medium tracking-wide leading-relaxed mt-2 uppercase">
                {splash.sub}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. CHECKMATE OVERLAY */}
      <AnimatePresence>
        {isCheckmate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-40 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
          >
            <motion.div
              initial={{ scale: 0.5, y: 20 }}
              animate={{ scale: 1, y: 0, transition: { type: "spring", delay: 0.2 } }}
              className="space-y-4 max-w-sm"
            >
              <div className="text-6xl animate-bounce">👑🏆</div>
              <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-white tracking-wider uppercase font-sans">
                Checkmate
              </h2>
              <p className="text-xs text-slate-300 font-medium font-sans leading-relaxed">
                The king has fallen! Tactical operations completed under strict checkmate rules.
              </p>
              <div className="pt-2">
                <span className="text-[10px] bg-amber-950/80 border border-amber-900 text-amber-400 px-3 py-1 rounded-full font-bold uppercase tracking-widest font-mono">
                  Arena Solved
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
