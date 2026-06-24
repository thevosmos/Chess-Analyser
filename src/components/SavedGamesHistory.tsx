import React, { useState, useEffect } from "react";
import { 
  Bookmark, 
  Trash2, 
  Save, 
  History, 
  Search, 
  Share2, 
  Play, 
  Plus, 
  Check, 
  X,
  FileText
} from "lucide-react";
import { SavedGame, AnalysisMove, GameMetadata, GameReport } from "../types";

interface SavedGamesHistoryProps {
  gameMoves: AnalysisMove[];
  metadata: GameMetadata;
  fen: string;
  accuracyReport: GameReport | null;
  activeIndex: number;
  activeOpeningName?: string;
  onLoadGame: (saved: SavedGame) => void;
  onNotify: (alert: { text: string; sub: string; type: string }) => void;
}

export default function SavedGamesHistory({
  gameMoves,
  metadata,
  fen,
  accuracyReport,
  activeIndex,
  activeOpeningName,
  onLoadGame,
  onNotify
}: SavedGamesHistoryProps) {
  const [savedGames, setSavedGames] = useState<SavedGame[]>([]);
  const [customName, setCustomName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Load saved games list from localStorage on mount
  useEffect(() => {
    const localData = localStorage.getItem("gambit_saved_games");
    if (localData) {
      try {
        setSavedGames(JSON.parse(localData));
      } catch (e) {
        console.error("Error reading saved games list:", e);
      }
    }
  }, []);

  // Update localStorage when list changes
  const updateSavedGames = (newList: SavedGame[]) => {
    setSavedGames(newList);
    localStorage.setItem("gambit_saved_games", JSON.stringify(newList));
  };

  // Pre-fill input value automatically when current game details change
  const defaultSugName = `${metadata.white?.name || "White"} vs ${metadata.black?.name || "Black"}${
    gameMoves.length > 0 ? ` (${gameMoves.length} plies)` : ""
  }`;

  const handleSaveGame = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = customName.trim() || defaultSugName;
    
    const newSavedItem: SavedGame = {
      id: "game_" + Date.now(),
      name: finalName,
      savedAt: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }),
      fen,
      gameMoves: JSON.parse(JSON.stringify(gameMoves)), // deep clone
      metadata: JSON.parse(JSON.stringify(metadata)),
      accuracyReport: accuracyReport ? JSON.parse(JSON.stringify(accuracyReport)) : null,
      activeIndex
    };

    const updatedList = [newSavedItem, ...savedGames];
    updateSavedGames(updatedList);
    setCustomName("");
    setIsSaving(false);

    onNotify({
      text: "Game Saved Successfully",
      sub: `"${finalName}" has been secure-cached local-first in your browser database history.`,
      type: "success"
    });
  };

  const handleDeleteGame = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filteredList = savedGames.filter((g) => g.id !== id);
    updateSavedGames(filteredList);
    onNotify({
      text: "Analysis Removed",
      sub: `"${name}" was deleted successfully from your cache history.`,
      type: "success"
    });
  };

  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to wipe all saved games from your browser container storage? This is irreversible.")) {
      updateSavedGames([]);
      onNotify({
        text: "History Cleared",
        sub: "All cached analysis entries have been permanently removed.",
        type: "success"
      });
    }
  };

  // Export current list as a complete JSON backup
  const handleExportAll = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(savedGames, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `chess_analyser_history_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      console.error(e);
    }
  };

  // Convert game moves list back to a PGN-like string for share copy
  const handleCopyPgn = (game: SavedGame, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      let pgnOutput = `[Event "${game.metadata.event || "Local Arena Match"}"]\n`;
      pgnOutput += `[White "${game.metadata.white?.name || "White"}"]\n`;
      pgnOutput += `[Black "${game.metadata.black?.name || "Black"}"]\n`;
      pgnOutput += `[Site "Local Browser Cache"]\n`;
      pgnOutput += `[Date "${game.savedAt}"]\n\n`;

      let movePairs = [];
      for (let i = 0; i < game.gameMoves.length; i += 2) {
        const moveNumber = Math.floor(i / 2) + 1;
        const whiteMove = game.gameMoves[i]?.san || "";
        const blackMove = game.gameMoves[i + 1]?.san || "";
        movePairs.push(`${moveNumber}. ${whiteMove} ${blackMove}`.trim());
      }
      pgnOutput += movePairs.join(" ");

      navigator.clipboard.writeText(pgnOutput);
      onNotify({
        text: "PGN Copied to Clipboard",
        sub: "You can paste this PGN string into any external study tool direct analyzer.",
        type: "success"
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Filter listed games on basis of search queries
  const filteredGames = savedGames.filter((g) => {
    const s = searchQuery.toLowerCase();
    const matchesName = g.name.toLowerCase().includes(s);
    const matchesWhite = (g.metadata.white?.name || "").toLowerCase().includes(s);
    const matchesBlack = (g.metadata.black?.name || "").toLowerCase().includes(s);
    const matchesEvent = (g.metadata.event || "").toLowerCase().includes(s);
    return matchesName || matchesWhite || matchesBlack || matchesEvent;
  });

  return (
    <div className="bg-[#0e0f14]/80 border border-white/[0.05] p-5 rounded-2xl shadow-xl backdrop-blur-lg flex flex-col gap-4 font-sans text-xs">
      {/* Title & Actions */}
      <div className="flex items-center justify-between border-b border-slate-800/50 pb-2.5">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <History className="w-4 h-4 text-emerald-400" />
          Saved Analyses & Match History
        </h2>
        {savedGames.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-[10px] text-red-400 hover:text-red-300 font-mono font-medium hover:underline transition uppercase tracking-wide cursor-pointer select-none"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Save Current Position Trigger Form */}
      {!isSaving ? (
        <button
          onClick={() => setIsSaving(true)}
          className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-1.5 active:scale-[0.98] cursor-pointer shadow-md shadow-emerald-950/20"
        >
          <Save className="w-3.5 h-3.5" />
          Save Current Analysis Match
        </button>
      ) : (
        <form onSubmit={handleSaveGame} className="space-y-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800/80 animate-fade-in">
          <p className="font-semibold text-slate-300 text-[10px] uppercase tracking-wider block mb-1">Enter Match Label:</p>
          <div className="space-y-2">
            <input
              type="text"
              placeholder={defaultSugName}
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-405"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-[10px] uppercase tracking-wider font-extrabold rounded-lg transition text-center cursor-pointer"
              >
                Confirm Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomName("");
                  setIsSaving(false);
                }}
                className="px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Search Input Filter */}
      {savedGames.length > 0 && (
        <div className="relative">
          <input
            type="text"
            placeholder="Search saved matches by player..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-2 pl-8 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")} 
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* MATCHES LIST */}
      <div className="space-y-2 max-h-[310px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
        {filteredGames.length > 0 ? (
          filteredGames.map((game) => (
            <div
              key={game.id}
              onClick={() => onLoadGame(game)}
              className="group bg-[#040508]/60 hover:bg-slate-900/40 border border-slate-900 hover:border-emerald-500/20 px-3 py-2.5 rounded-xl transition flex flex-col gap-1.5 cursor-pointer relative"
              title="Click to load/analyze this match"
            >
              <div className="flex items-start justify-between gap-1.5 text-slate-200">
                <span className="font-bold text-[11px] leading-tight text-slate-200 group-hover:text-emerald-400 transition break-words max-w-[85%]">
                  {game.name}
                </span>
                <span className="text-[9px] text-slate-500 whitespace-nowrap">{game.savedAt.split(",")[0]}</span>
              </div>

              {/* Game Metadata info details line */}
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <span className="bg-slate-900 px-1.5 py-0.5 rounded font-mono text-slate-400 font-bold">
                  {game.gameMoves.length} Plies
                </span>
                {game.accuracyReport && (
                  <span className="text-[10px] text-emerald-400 font-medium">
                    🎯 Acc: W:{game.accuracyReport.whiteAccuracy}% B:{game.accuracyReport.blackAccuracy}%
                  </span>
                )}
              </div>

              {/* Hover actions display menu bar overlay */}
              <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition absolute right-2.5 bottom-2 bg-slate-900/90 pl-2 rounded-lg py-0.5">
                <button
                  onClick={(e) => handleCopyPgn(game, e)}
                  title="Copy Game PGN info"
                  className="p-1 bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-white rounded transition active:scale-90"
                >
                  <Share2 className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => handleDeleteGame(game.id, game.name, e)}
                  title="Remove match"
                  className="p-1 bg-slate-950/80 border border-slate-850 hover:bg-red-950/20 text-slate-500 hover:text-red-400 rounded transition active:scale-90"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-slate-500 bg-slate-900/10 border border-dashed border-slate-900 rounded-xl space-y-1">
            <Bookmark className="w-5 h-5 mx-auto opacity-20" />
            <p className="text-[10px] font-medium text-slate-400 font-sans">
              {searchQuery ? "No matches match search" : "No saved matches yet"}
            </p>
            <p className="text-[9px] text-slate-500 font-sans leading-tight">
              {searchQuery ? "Try a different search label" : "Your offline saves will appear here."}
            </p>
          </div>
        )}
      </div>

      {/* Bottom utility helper stats info */}
      {savedGames.length > 0 && (
        <div className="flex items-center justify-between text-[9px] text-slate-500 border-t border-slate-900 pt-2 font-mono">
          <span>{savedGames.length} saved matches in local index</span>
          <button
            onClick={handleExportAll}
            className="text-[9px] text-indigo-400 hover:text-indigo-300 font-medium transition hover:underline"
          >
            Export All (.json)
          </button>
        </div>
      )}
    </div>
  );
}
