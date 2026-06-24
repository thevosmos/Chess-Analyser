export interface Evaluation {
  score: string; // cp "+0.45", "-1.23" or "M5" (mate in 5)
  numericScore: number; // raw centipawn value (white perspective) for charts
  bestMove?: string; // UCI string like "e2e4"
  depth?: number;
}

export type MoveClassification = 
  | "book" 
  | "brilliant"
  | "great"
  | "best" 
  | "excellent" 
  | "good" 
  | "miss" 
  | "inaccuracy"  
  | "mistake" 
  | "blunder";

export interface AnalysisMove {
  san: string; // e.g. "e4"
  uci: string; // e.g. "e2e4"
  fenBefore: string;
  fenAfter: string;
  evaluation?: Evaluation;
  classification?: MoveClassification;
  aiExplanation?: string;
  isCachedExplanation?: boolean;
  timeSpent?: number;
}

export interface PlayerInfo {
  name: string;
  rating?: string;
}

export interface GameMetadata {
  event?: string;
  site?: string;
  date?: string;
  round?: string;
  white: PlayerInfo;
  black: PlayerInfo;
  result?: string;
  opening?: string;
}

export interface GameReport {
  whiteAccuracy: number;
  blackAccuracy: number;
  whiteStats: Record<MoveClassification, number>;
  blackStats: Record<MoveClassification, number>;
}

export interface SavedGame {
  id: string;
  name: string;
  savedAt: string;
  fen: string;
  gameMoves: AnalysisMove[];
  metadata: GameMetadata;
  accuracyReport: GameReport | null;
  activeIndex: number;
}

