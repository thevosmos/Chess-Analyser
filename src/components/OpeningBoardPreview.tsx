import React, { useMemo } from "react";
import { Chess } from "chess.js";

// Wikimedia SVG URLs for beautifully rendered chess pieces
const getPieceSvgLocal = (type: string, color: string): string => {
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

interface OpeningBoardPreviewProps {
  sequence: string;
}

export default function OpeningBoardPreview({ sequence }: OpeningBoardPreviewProps) {
  const board = useMemo(() => {
    const chess = new Chess();
    try {
      chess.load("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
      const pathMoves = sequence.split(" ");
      for (const mv of pathMoves) {
        if (!mv.trim()) continue;
        chess.move(mv.trim());
      }
    } catch (err) {
      console.warn(`OpeningBoardPreview: Move failed in path "${sequence}"`, err);
    }
    return chess.board();
  }, [sequence]);

  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"];

  return (
    <div 
      className="relative w-20 h-20 sm:w-24 sm:h-24 grid grid-cols-8 grid-rows-8 border border-white/[0.08] rounded-lg overflow-hidden shrink-0 select-none bg-slate-950 shadow-md"
      title={`Preview grid for: ${sequence}`}
    >
      {ranks.map((rank, rIdx) =>
        files.map((file, fIdx) => {
          const isLight = (parseInt(rank) + fIdx) % 2 !== 0;
          const piece = board[rIdx]?.[fIdx];
          const tileBg = isLight ? "bg-[#eae6d1]" : "bg-[#558460]";

          return (
            <div
              key={`${file}${rank}`}
              className={`relative flex items-center justify-center ${tileBg}`}
            >
              {piece && (
                <img
                  src={getPieceSvgLocal(piece.type, piece.color)}
                  alt={`${piece.color === "w" ? "White" : "Black"} ${piece.type}`}
                  className="w-[92%] h-[92%] object-contain select-none pointer-events-none"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
