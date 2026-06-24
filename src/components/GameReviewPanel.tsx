import React from "react";
import { 
  Volume2, 
  X, 
  ChevronRight, 
  Award,
  Sparkles,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { GameReport, GameMetadata, AnalysisMove, MoveClassification } from "../types";

interface GameReviewPanelProps {
  accuracyReport: GameReport;
  metadata: GameMetadata;
  gameMoves: AnalysisMove[];
  activeIndex: number;
  onSelectMoveIndex: (idx: number) => void;
  onClose?: () => void;
}

export default function GameReviewPanel({
  accuracyReport,
  metadata,
  gameMoves,
  activeIndex,
  onSelectMoveIndex,
  onClose
}: GameReviewPanelProps) {
  const [isStatsExpanded, setIsStatsExpanded] = React.useState(false);
  
  // Custom Coach Advice generator based on scores
  const getCoachAdvice = () => {
    const whiteAcc = accuracyReport.whiteAccuracy;
    const blackAcc = accuracyReport.blackAccuracy;
    const diff = Math.abs(whiteAcc - blackAcc);
    
    if (whiteAcc > 85 && blackAcc > 85) {
      return "An absolute masterpiece! Outstanding tactical depth on both sides. Both played like true grandmasters.";
    }
    if (whiteAcc > 75 && diff < 8) {
      return "A very close and hard-fought match! Well played by both players. Let's look at the critical turning points together.";
    }
    if (whiteAcc > blackAcc) {
      if (diff > 15) {
        return `White capitalized brilliantly on critical blunders in this match. Well done pouncing on those free pieces!`;
      }
      return "White won with some slick tactics! Some solid calculation made all the difference.";
    } else {
      if (diff > 15) {
        return `Black was extremely precise, seizing the initiative and punishing inaccuracies ruthlessly.`;
      }
      return "Black dominated the midgame squares. Let's trace how the balance swung.";
    }
  };

  const adviceCommentary = getCoachAdvice();

  // Metrics definitions for comparative table matching Image 3 structure
  const metricsList: {
    key: MoveClassification;
    label: string;
    badgeBg: string;
    badgeText: string;
    shadowColor?: string;
  }[] = [
    { key: "brilliant", label: "Brilliant", badgeBg: "bg-[#12b6a6]", badgeText: "!!", shadowColor: "rgba(18,182,166,0.35)" },
    { key: "great", label: "Great", badgeBg: "bg-[#1b9af7]", badgeText: "!", shadowColor: "rgba(27,154,247,0.3)" },
    { key: "best", label: "Best", badgeBg: "bg-[#81b64c]", badgeText: "★" },
    { key: "excellent", label: "Excellent", badgeBg: "bg-[#85c441]", badgeText: "👍" },
    { key: "good", label: "Good", badgeBg: "bg-[#36b37e]", badgeText: "✓" },
    { key: "book", label: "Book", badgeBg: "bg-[#a5743f]", badgeText: "📖" },
    { key: "inaccuracy", label: "Inaccuracy", badgeBg: "bg-[#f5cb35]", badgeText: "?!" },
    { key: "mistake", label: "Mistake", badgeBg: "bg-[#e28743]", badgeText: "?" },
    { key: "miss", label: "Miss", badgeBg: "bg-[#db4c44]", badgeText: "✕" },
    { key: "blunder", label: "Blunder", badgeBg: "bg-[#ef4444]", badgeText: "??" }
  ];

  // If collapsed, only show the key metrics (matching Chess.com collapsed view in Image 3)
  const displayedMetrics = isStatsExpanded 
    ? metricsList 
    : metricsList.filter(m => ["brilliant", "great", "best", "mistake", "miss", "blunder"].includes(m.key));

  // Heuristic to calculate estimated performance rating matching Chess.com style (100 to 2700+ Elo)
  const getPerformanceRating = (acc: number) => {
    if (acc >= 98) return Math.round(2500 + (acc - 98) * 100); // 98-100% -> 2500-2700
    if (acc >= 95) return Math.round(2100 + (acc - 95) * 133); // 95-97% -> 2100-2500
    if (acc >= 85) return Math.round(1500 + (acc - 85) * 60);  // 85-94% -> 1500-2100
    if (acc >= 70) return Math.round(1000 + (acc - 70) * 33);  // 70-84% -> 1000-1500
    if (acc >= 40) return Math.round(500 + (acc - 40) * 16.6); // 40-69% -> 500-1000
    return Math.round(100 + acc * 10);                        // <40% -> 100-500
  };

  const whiteRating = getPerformanceRating(accuracyReport.whiteAccuracy);
  const blackRating = getPerformanceRating(accuracyReport.blackAccuracy);

  // Heuristic to analyze game phases (Opening, Middlegame, Endgame) for each side
  const getPhaseIndicator = (playerColor: "w" | "b", startPly: number, endPly: number) => {
    const plies = gameMoves.slice(startPly, endPly);
    const playerPlies = plies.filter((_, idx) => {
      const isWhitePly = (startPly + idx) % 2 === 0;
      return playerColor === "w" ? isWhitePly : !isWhitePly;
    });

    if (playerPlies.length === 0) return "-";

    const counts: Record<string, number> = {};
    playerPlies.forEach(p => {
      const cls = p.classification || "good";
      counts[cls] = (counts[cls] || 0) + 1;
    });

    const book = counts["book"] || 0;
    const best = counts["best"] || 0;
    const excellent = counts["excellent"] || 0;
    const brilliant = counts["brilliant"] || 0;
    const great = counts["great"] || 0;
    const good = counts["good"] || 0;
    const blunder = counts["blunder"] || 0;
    const mistake = counts["mistake"] || 0;
    const miss = counts["miss"] || 0;

    const total = playerPlies.length;

    if (book / total > 0.35) return "book";
    if ((best + brilliant + great) / total > 0.45) return "best";
    if (blunder / total > 0.25 || (mistake + miss) / total > 0.35) return "mistake";
    if ((excellent + good) / total > 0.45) return "excellent";
    return "good";
  };

  // Opening (moves 1-8 approx. plies 0-16)
  const whiteOpening = getPhaseIndicator("w", 0, 16);
  const blackOpening = getPhaseIndicator("b", 0, 16);

  // Middlegame (moves 9-25 approx. plies 16-50)
  const whiteMiddlegame = getPhaseIndicator("w", 16, 50);
  const blackMiddlegame = getPhaseIndicator("b", 16, 50);

  // Endgame (moves 26+ approx. plies 50+)
  const whiteEndgame = getPhaseIndicator("w", 50, 999);
  const blackEndgame = getPhaseIndicator("b", 50, 999);

  // Helper to render Chess.com phase indicator icons
  const renderPerformanceBadge = (phase: string) => {
    switch (phase) {
      case "book":
        return (
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#a5743f] text-[9px] text-white shadow-sm border border-black/20" title="Opening Theory Book">📖</span>
        );
      case "best":
        return (
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#81b64c] text-[10px] text-white shadow-sm border border-black/20" title="Best">★</span>
        );
      case "excellent":
        return (
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#85c441] text-[9px] text-white shadow-sm border border-black/20" title="Excellent">👍</span>
        );
      case "good":
        return (
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#36b37e] text-[9px] text-white shadow-sm border border-black/20" title="Good">✓</span>
        );
      case "mistake":
        return (
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#e28743] text-[10px] text-white font-serif font-bold shadow-sm border border-black/20" title="Mistake">?</span>
        );
      case "-":
      default:
        return (
          <span className="text-slate-500 font-bold text-xs font-mono">-</span>
        );
    }
  };

  return (
    <div className="bg-[#0e0f14]/95 border border-white/[0.08] rounded-2xl shadow-2xl flex flex-col font-sans overflow-hidden animate-fade-in text-slate-100">
      
      {/* 1. HEADER (matching Image 3 top bar) */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-900">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/40">
            <Award className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Game Review
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="text-slate-400 hover:text-white p-1 hover:bg-slate-900 rounded transition cursor-pointer">
            <Volume2 className="w-3.5 h-3.5" />
          </button>
          {onClose && (
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 hover:bg-slate-900 rounded transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4 max-h-[580px] overflow-y-auto scrollbar-thin">
        {/* 2. COACH SPEECH BUBBLE CARD (matching illustration from references) */}
        <div className="flex items-center gap-3 bg-slate-950 p-3.5 rounded-2xl border border-slate-900 relative">
          
          {/* Coach illustration custom-drawn using pure vector CSS */}
          <div className="shrink-0 relative w-12 h-12 bg-indigo-950 rounded-full overflow-hidden border-2 border-slate-800 shadow-md">
            {/* Skin base color */}
            <div className="absolute inset-x-2 bottom-0 top-1.5 bg-[#f5cad2] rounded-t-3xl rounded-b-md" />
            {/* Glasses */}
            <div className="absolute top-4 left-2.5 w-3 h-2 bg-transparent border-[1.5px] border-slate-400 rounded-sm" />
            <div className="absolute top-4 right-2.5 w-3 h-2 bg-transparent border-[1.5px] border-slate-400 rounded-sm" />
            <div className="absolute top-4.5 left-5 w-2 h-[1px] bg-slate-400" />
            {/* Beard */}
            <div className="absolute bottom-1.5 inset-x-2.5 h-4.5 bg-[#4a3728] rounded-b-xl opacity-85" />
            {/* Hair */}
            <div className="absolute top-1 inset-x-2.5 h-3 bg-[#4a3728] rounded-t-full" />
            {/* Beard mustache */}
            <div className="absolute bottom-4 inset-x-4 h-1.5 bg-[#4a3728] rounded" />
            {/* Eyes */}
            <div className="absolute top-4.5 left-3.5 w-1 h-1 bg-slate-900 rounded-full" />
            <div className="absolute top-4.5 right-3.5 w-1 h-1 bg-slate-900 rounded-full" />
            {/* Collar shirts */}
            <div className="absolute bottom-0 inset-x-1 h-2.5 bg-slate-800 rounded-t-sm" />
          </div>

          {/* Chat bubble pointer */}
          <div className="absolute left-[54px] top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-950 border-l border-t border-slate-900 rotate-45" />

          {/* Speech Text */}
          <div className="flex-1 text-[11px] leading-relaxed text-slate-200 pl-1 font-medium bg-slate-950/20 p-1 rounded-lg">
            {adviceCommentary}
          </div>
        </div>

        {/* 3. EVALUATION SWING SPARKLINE AREA CHART */}
        <div className="bg-slate-950/90 border border-slate-900 p-3.5 rounded-2xl">
          <div className="flex items-center justify-between mb-2 text-[10px] text-slate-400">
            <span className="font-bold tracking-wider uppercase font-mono text-[9px] text-slate-450">Evaluation swing path:</span>
            <span className="text-[9px] text-[#81b64c] font-bold">White Advantage &darr;</span>
          </div>

          <div className="relative h-20 bg-[#07090d] rounded-xl overflow-hidden border border-slate-900/80 p-1">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Center balanced line */}
              <line x1="0" y1="50" x2="100" y2="50" stroke="#101826" strokeWidth="1" strokeDasharray="2" />
              
              {(() => {
                const points = gameMoves.map((m, idx) => {
                  const val = m.evaluation?.numericScore || 0;
                  const x = (idx / Math.max(1, gameMoves.length - 1)) * 100;
                  // Map raw cp score into graphical Y range [5%, 95%]
                  const cappedVal = Math.max(-500, Math.min(500, val));
                  const y = 50 - (cappedVal / 500) * 45;
                  return { x, y, cls: m.classification };
                });

                if (points.length < 2) return null;

                const pathString = points.reduce((acc, p, idx) => {
                  return acc + `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`;
                }, "");

                // Under-filled shade polygon for visual perspective matching Image 3
                const fillPathString = `${pathString} L 100 50 L 0 50 Z`;

                return (
                  <>
                    {/* Swing filled accent area */}
                    <path
                      d={fillPathString}
                      fill="url(#reviewSwingFill)"
                      opacity="0.15"
                      className="transition-all duration-300"
                    />

                    {/* Peak curve outline */}
                    <path
                      d={pathString}
                      fill="none"
                      stroke="url(#reviewSwingOutline)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Intersected dots representing critical plies */}
                    {points.map((p, idx) => {
                      if (!p.cls || p.cls === "good" || p.cls === "best" || p.cls === "excellent") return null;
                      
                      // Highlight colour representing mistake/blunder spikes on graph
                      let dotColor = "fill-[#ef4444]";
                      if (p.cls === "brilliant") dotColor = "fill-[#12b6a6]";
                      else if (p.cls === "great") dotColor = "fill-[#1b9af7]";
                      else if (p.cls === "inaccuracy") dotColor = "fill-[#f5cb35]";
                      else if (p.cls === "mistake") dotColor = "fill-[#e28743]";

                      return (
                        <circle
                          key={idx}
                          cx={p.x}
                          cy={p.y}
                          r={activeIndex === idx ? "2.5" : "1.5"}
                          className={`cursor-pointer transition-all ${dotColor} ${
                            activeIndex === idx ? "stroke-white stroke-[0.8px]" : ""
                          }`}
                          onClick={() => onSelectMoveIndex(idx)}
                        />
                      );
                    })}

                    <defs>
                      <linearGradient id="reviewSwingFill" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#ef4444" />
                      </linearGradient>
                      <linearGradient id="reviewSwingOutline" x1="0%" y1="50%" x2="100%" y2="50%">
                        <stop offset="0%" stopColor="#81b64c" />
                        <stop offset="50%" stopColor="#1b9af7" />
                        <stop offset="100%" stopColor="#a3e635" />
                      </linearGradient>
                    </defs>
                  </>
                );
              })()}
            </svg>
          </div>
        </div>

        {/* 4. PLAYERS Comparative Block (showing big accuracy card matching Image 3) */}
        <div className="grid grid-cols-2 gap-3">
          
          {/* White Player Profile */}
          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-900/60 flex flex-col items-center text-center">
            <span className="text-[9px] text-slate-500 font-bold tracking-wider uppercase mb-1 whitespace-nowrap">White Player</span>
            {/* White Square profile avatar */}
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-2 flex items-center justify-center text-xl select-none uppercase font-black text-amber-400">
              {metadata.white.name ? metadata.white.name.charAt(0) : "W"}
            </div>
            <p className="text-[11px] font-bold text-slate-200 truncate max-w-full mb-1">
              {metadata.white.name || "White"}
            </p>
            {/* Huge numeric accuracy block */}
            <div className="mt-1 px-3.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg">
              <span className="text-lg font-black text-emerald-400 font-mono">
                {accuracyReport.whiteAccuracy}.0
              </span>
            </div>
          </div>

          {/* Black Player Profile */}
          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-900/60 flex flex-col items-center text-center">
            <span className="text-[9px] text-slate-500 font-bold tracking-wider uppercase mb-1 whitespace-nowrap">Black Player</span>
            {/* Black Square profile avatar */}
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 mb-2 flex items-center justify-center text-xl select-none uppercase font-black text-indigo-400">
              {metadata.black.name ? metadata.black.name.charAt(0) : "B"}
            </div>
            <p className="text-[11px] font-bold text-slate-200 truncate max-w-full mb-1">
              {metadata.black.name || "Black"}
            </p>
            {/* Huge numeric accuracy block */}
            <div className="mt-1 px-3.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg">
              <span className="text-lg font-black text-indigo-400 font-mono">
                {accuracyReport.blackAccuracy}.0
              </span>
            </div>
          </div>

        </div>

        {/* 5. TIERS Metrics Breakdown Table (comparing count side-by-side with high-fidelity progress bars) */}
        <div className="bg-[#0e0f14]/80 p-4 rounded-2xl border border-white/[0.04] space-y-3 shadow-inner">
          <div className="grid grid-cols-12 text-[10px] text-slate-500 font-extrabold uppercase tracking-widest pb-2 border-b border-white/[0.05]">
            <div className="col-span-4 text-right pr-3 truncate">
              WHITE
            </div>
            <div className="col-span-4 text-center text-slate-400 font-semibold">
              MOVE CLASSIFICATION
            </div>
            <div className="col-span-4 text-left pl-3 truncate">
              BLACK
            </div>
          </div>

          <div className="space-y-1">
            {displayedMetrics.map((m) => {
              const whiteCount = accuracyReport.whiteStats[m.key] || 0;
              const blackCount = accuracyReport.blackStats[m.key] || 0;
              const total = whiteCount + blackCount;

              // Do not hide brilliant and great moves. Let's show all moves always to match traditional chess.com reviews!
              // But if everything is 0, let's keep them styled elegantly with subtle opacity.
              const hasMoves = total > 0;

              // Calculate percentages for the progress bars
              const whitePct = hasMoves ? (whiteCount / total) * 100 : 0;
              const blackPct = hasMoves ? (blackCount / total) * 100 : 0;

              // Extract tailwind background color classes for bars
              let barColor = "bg-slate-700";
              if (m.key === "brilliant") barColor = "bg-[#12b6a6]";
              else if (m.key === "great") barColor = "bg-[#1b9af7]";
              else if (m.key === "book") barColor = "bg-[#a5743f]";
              else if (m.key === "best") barColor = "bg-[#81b64c]";
              else if (m.key === "excellent") barColor = "bg-[#85c441]";
              else if (m.key === "good") barColor = "bg-[#36b37e]";
              else if (m.key === "inaccuracy") barColor = "bg-[#f5cb35]";
              else if (m.key === "mistake") barColor = "bg-[#e28743]";
              else if (m.key === "miss") barColor = "bg-[#db4c44]";
              else if (m.key === "blunder") barColor = "bg-[#ef4444]";

              return (
                <div 
                  key={m.key} 
                  className={`grid grid-cols-12 items-center text-xs py-1.5 px-2.5 rounded-xl border border-transparent transition-all duration-200 ${
                    hasMoves 
                      ? "hover:bg-white/[0.02] hover:border-white/[0.04] bg-white/[0.01]" 
                      : "opacity-60 hover:opacity-100"
                  }`}
                >
                  {/* Left Column: White Player Stats & Bar */}
                  <div className="col-span-4 flex items-center justify-end gap-2.5">
                    <span className={`font-mono font-black text-xs tracking-tight ${whiteCount > 0 ? "text-white scale-105" : "text-slate-600"}`}>
                      {whiteCount}
                    </span>
                    {/* Horizontal bar growing to the left */}
                    <div className="h-1.5 bg-slate-900 rounded-full w-14 overflow-hidden flex justify-end shrink-0 hidden sm:flex">
                      <div 
                        className={`h-full ${barColor} rounded-full transition-all duration-700 ease-out`} 
                        style={{ width: `${whitePct}%` }}
                      />
                    </div>
                  </div>

                  {/* Centered category badge with name */}
                  <div className="col-span-4 flex items-center justify-center gap-2">
                    <div 
                      className={`w-5.5 h-5.5 rounded-full flex items-center justify-center font-extrabold text-[9px] text-white shrink-0 ${m.badgeBg} shadow-md select-none border border-black/20`}
                      style={m.shadowColor ? { boxShadow: `0 0 8px ${m.shadowColor}` } : undefined}
                      title={m.label}
                    >
                      <span className="leading-none flex items-center justify-center text-[10px]">{m.badgeText}</span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-300 tracking-wide select-none min-w-[65px] text-left">
                      {m.label}
                    </span>
                  </div>

                  {/* Right Column: Black Player Bar & Stats */}
                  <div className="col-span-4 flex items-center justify-start gap-2.5">
                    {/* Horizontal bar growing to the right */}
                    <div className="h-1.5 bg-slate-900 rounded-full w-14 overflow-hidden shrink-0 hidden sm:block">
                      <div 
                        className={`h-full ${barColor} rounded-full transition-all duration-700 ease-out`} 
                        style={{ width: `${blackPct}%` }}
                      />
                    </div>
                    <span className={`font-mono font-black text-xs tracking-tight ${blackCount > 0 ? "text-white scale-105" : "text-slate-600"}`}>
                      {blackCount}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Collapse/Expand Toggle Button (matching downward chevron in Image 3) */}
          <div className="flex justify-center pt-1 border-t border-white/[0.03]">
            <button
              onClick={() => setIsStatsExpanded(!isStatsExpanded)}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-white transition py-1 px-3 bg-slate-950/40 hover:bg-slate-950/80 rounded-lg border border-white/[0.03] cursor-pointer"
            >
              {isStatsExpanded ? (
                <>
                  <span>Show Fewer Stats</span>
                  <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                </>
              ) : (
                <>
                  <span>Show All Stats</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* 6. ESTIMATED GAME PERFORMANCE RATINGS & PHASE STAGE PRECISION (Matching Image 3) */}
        <div className="bg-[#0e0f14]/85 p-4 rounded-2xl border border-white/[0.04] space-y-3.5 shadow-xl">
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-extrabold uppercase tracking-widest pb-2 border-b border-white/[0.05]">
            <span>PERFORMANCE</span>
            <span className="text-slate-400">GAME PHASE ANALYSIS</span>
            <span>PERFORMANCE</span>
          </div>

          <div className="space-y-3">
            {/* Game Rating Row */}
            <div className="grid grid-cols-12 items-center py-1">
              <div className="col-span-4 flex justify-end">
                <span className="px-3 py-1.5 bg-white text-slate-950 font-black font-mono text-sm rounded-lg shadow-md select-none">
                  {whiteRating}
                </span>
              </div>
              <div className="col-span-4 text-center text-xs font-black tracking-tight text-slate-200">
                Game Rating
              </div>
              <div className="col-span-4 flex justify-start">
                <span className="px-3 py-1.5 bg-slate-800 text-slate-100 font-black font-mono text-sm rounded-lg shadow-md border border-slate-700/60 select-none">
                  {blackRating}
                </span>
              </div>
            </div>

            {/* Opening Row */}
            <div className="grid grid-cols-12 items-center py-1.5 border-t border-white/[0.02]">
              <div className="col-span-4 flex justify-end">
                {renderPerformanceBadge(whiteOpening)}
              </div>
              <div className="col-span-4 text-center text-[11px] font-semibold text-slate-450">
                Opening
              </div>
              <div className="col-span-4 flex justify-start">
                {renderPerformanceBadge(blackOpening)}
              </div>
            </div>

            {/* Middlegame Row */}
            <div className="grid grid-cols-12 items-center py-1.5 border-t border-white/[0.02]">
              <div className="col-span-4 flex justify-end">
                {renderPerformanceBadge(whiteMiddlegame)}
              </div>
              <div className="col-span-4 text-center text-[11px] font-semibold text-slate-450">
                Middlegame
              </div>
              <div className="col-span-4 flex justify-start">
                {renderPerformanceBadge(blackMiddlegame)}
              </div>
            </div>

            {/* Endgame Row */}
            <div className="grid grid-cols-12 items-center py-1.5 border-t border-white/[0.02]">
              <div className="col-span-4 flex justify-end">
                {renderPerformanceBadge(whiteEndgame)}
              </div>
              <div className="col-span-4 text-center text-[11px] font-semibold text-slate-450">
                Endgame
              </div>
              <div className="col-span-4 flex justify-start">
                {renderPerformanceBadge(blackEndgame)}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 7. GIANT INTERACTIVE BUTTON (matching Image 3 "Start Review" button) */}
      <div className="p-4 bg-slate-950/85 border-t border-slate-900/60 flex flex-col gap-2">
        <button
          onClick={() => onSelectMoveIndex(0)}
          className="w-full py-3 bg-gradient-to-r from-[#81b64c] to-[#92cc5c] hover:from-[#92cc5c] hover:to-[#a3e26c] text-white font-bold rounded-xl transition flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer shadow-lg shadow-emerald-950/20 text-sm"
        >
          <Sparkles className="w-4 h-4 text-white" />
          Start Step-by-Step Review
        </button>
      </div>

    </div>
  );
}
