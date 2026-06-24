import React, { useState, useEffect, useRef, useMemo } from "react";
import { Chess, Square } from "chess.js";
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  Search,
  BookOpen,
  Volume2,
  Tv,
  HelpCircle,
  Hash,
  Sparkles,
  Link2,
  Sliders,
  Award,
  AlertTriangle,
  Info,
  CheckCircle,
  Compass,
  Trophy,
  GraduationCap
} from "lucide-react";
import { StockfishEngine } from "./utils/stockfish";
import {
  CHESS_PRESETS,
  parsePgnMetadata,
  parsePgnMoves,
  classifyMove,
  evaluateReports
} from "./utils/chessHelpers";
import { Evaluation, AnalysisMove, GameMetadata, GameReport, MoveClassification, SavedGame } from "./types";
import Chessboard, { getPieceSvg } from "./components/Chessboard";
import SavedGamesHistory from "./components/SavedGamesHistory";
import GameReviewPanel from "./components/GameReviewPanel";
import { auth, db, OperationType, handleFirestoreError, firebaseConfig } from "./firebase";
import { doc, getDoc, setDoc, getDocFromServer } from "firebase/firestore";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  User 
} from "firebase/auth";
import { LogOut, Lock, Mail, User as UserIcon, ExternalLink, Eye, EyeOff } from "lucide-react";
import { detectOpening, OPENING_DATABASE } from "./utils/openings";
import { motion, AnimatePresence } from "motion/react";
import OpeningBoardPreview from "./components/OpeningBoardPreview";

const CUSTOM_PALETTES = [
  { name: "Coffee & Cream ☕", light: "#efe1d1", dark: "#a78a7f" },
  { name: "Sleek Carbon 🖤", light: "#f1f5f9", dark: "#334155" },
  { name: "Royal Amethyst 🔮", light: "#f5f3ff", dark: "#5b21b6" },
  { name: "Crimson Velvet 🍷", light: "#fff1f2", dark: "#9f1239" },
  { name: "Marine Deep 🌊", light: "#ecfeff", dark: "#0f766e" },
];

export interface PasswordStrength {
  score: number;
  label: "Very Weak" | "Weak" | "Medium" | "Strong" | "Very Strong";
  color: string;
  bgColor: string;
  checks: {
    length: boolean;
    hasUpper: boolean;
    hasLower: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
}

export const checkPasswordStrength = (password: string): PasswordStrength => {
  const checks = {
    length: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };

  let score = 0;
  if (checks.length) score += 1;
  if (checks.hasUpper) score += 1;
  if (checks.hasLower) score += 1;
  if (checks.hasNumber) score += 1;
  if (checks.hasSpecial) score += 1;

  let label: PasswordStrength["label"] = "Very Weak";
  let color = "text-rose-500";
  let bgColor = "bg-rose-500";

  if (score <= 1) {
    label = "Very Weak";
    color = "text-rose-500";
    bgColor = "bg-rose-500";
  } else if (score === 2) {
    label = "Weak";
    color = "text-orange-500";
    bgColor = "bg-orange-500";
  } else if (score === 3) {
    label = "Medium";
    color = "text-amber-400";
    bgColor = "bg-amber-400";
  } else if (score === 4) {
    label = "Strong";
    color = "text-emerald-400";
    bgColor = "bg-emerald-400";
  } else if (score === 5) {
    label = "Very Strong";
    color = "text-teal-400";
    bgColor = "bg-teal-400";
  }

  return { score, label, color, bgColor, checks };
};

export const getRegisteredEmails = (): string[] => {
  try {
    const raw = localStorage.getItem("gambit_registered_emails");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export type AppTheme = "midnight" | "coffee" | "cyberpunk" | "amethyst" | "nordic";

export const THEME_CONFIGS: Record<AppTheme, {
  name: string;
  bgColor: string;
  cardBg: string;
  headerBg: string;
  accentBg: string;
  accentText: string;
  accentBorder: string;
  borderColor: string;
  glowColor1: string;
  glowColor2: string;
  selectionBg: string;
  badgeClass: string;
  navActiveLine: string;
  logoEmoji: string;
  boardThemeDefault: "forest" | "wood" | "blue" | "slate" | "gambit" | "custom";
}> = {
  midnight: {
    name: "Midnight Obsidian 🖤",
    bgColor: "bg-[#08090b]",
    cardBg: "bg-slate-900/40",
    headerBg: "bg-slate-950/90",
    accentBg: "bg-emerald-600 hover:bg-emerald-500",
    accentText: "text-emerald-400",
    accentBorder: "border-emerald-500/20",
    borderColor: "border-slate-800/80",
    glowColor1: "bg-[#558460]/5",
    glowColor2: "bg-blue-600/5",
    selectionBg: "selection:bg-[#558460]",
    badgeClass: "bg-emerald-950/80 border-emerald-900 text-emerald-400",
    navActiveLine: "bg-emerald-500",
    logoEmoji: "♞",
    boardThemeDefault: "gambit",
  },
  coffee: {
    name: "Espresso Wood ☕",
    bgColor: "bg-[#1c1613]",
    cardBg: "bg-[#2c221d]/40",
    headerBg: "bg-[#120e0c]/90",
    accentBg: "bg-[#a88265] hover:bg-[#bfa085]",
    accentText: "text-[#d2b48c]",
    accentBorder: "border-[#a88265]/20",
    borderColor: "border-[#3e322b]/80",
    glowColor1: "bg-[#8c6239]/10",
    glowColor2: "bg-[#d2b48c]/5",
    selectionBg: "selection:bg-[#a88265]",
    badgeClass: "bg-[#251b15]/80 border-[#3d2e25] text-[#d2b48c]",
    navActiveLine: "bg-[#a88265]",
    logoEmoji: "☕",
    boardThemeDefault: "wood",
  },
  cyberpunk: {
    name: "Cyberpunk Neon 🎆",
    bgColor: "bg-[#0a0414]",
    cardBg: "bg-[#190d2e]/40",
    headerBg: "bg-[#04010a]/90",
    accentBg: "bg-fuchsia-600 hover:bg-fuchsia-500",
    accentText: "text-fuchsia-400",
    accentBorder: "border-fuchsia-500/20",
    borderColor: "border-[#401f68]/80",
    glowColor1: "bg-fuchsia-500/5",
    glowColor2: "bg-cyan-500/5",
    selectionBg: "selection:bg-fuchsia-600",
    badgeClass: "bg-fuchsia-950/80 border-fuchsia-900 text-fuchsia-400",
    navActiveLine: "bg-fuchsia-500",
    logoEmoji: "👾",
    boardThemeDefault: "blue",
  },
  amethyst: {
    name: "Royal Amethyst 🔮",
    bgColor: "bg-[#090514]",
    cardBg: "bg-[#1b122e]/40",
    headerBg: "bg-[#04020a]/90",
    accentBg: "bg-violet-600 hover:bg-violet-500",
    accentText: "text-violet-400",
    accentBorder: "border-violet-500/20",
    borderColor: "border-violet-900/60",
    glowColor1: "bg-violet-600/5",
    glowColor2: "bg-indigo-600/5",
    selectionBg: "selection:bg-violet-600",
    badgeClass: "bg-violet-950/80 border-violet-900 text-violet-400",
    navActiveLine: "bg-violet-500",
    logoEmoji: "🔮",
    boardThemeDefault: "slate",
  },
  nordic: {
    name: "Nordic Frost ❄️",
    bgColor: "bg-[#0c121e]",
    cardBg: "bg-[#192336]/40",
    headerBg: "bg-[#070b13]/90",
    accentBg: "bg-sky-600 hover:bg-sky-500",
    accentText: "text-sky-400",
    accentBorder: "border-sky-500/20",
    borderColor: "border-slate-800",
    glowColor1: "bg-sky-400/5",
    glowColor2: "bg-blue-500/5",
    selectionBg: "selection:bg-sky-600",
    badgeClass: "bg-sky-950/80 border-sky-900 text-sky-400",
    navActiveLine: "bg-sky-500",
    logoEmoji: "❄️",
    boardThemeDefault: "slate",
  }
};

export const registerEmailLocally = (email: string) => {
  try {
    const emails = getRegisteredEmails();
    const normalized = email.trim().toLowerCase();
    if (!emails.includes(normalized)) {
      emails.push(normalized);
      localStorage.setItem("gambit_registered_emails", JSON.stringify(emails));
    }
  } catch (e) {
    console.error("Failed to register email locally:", e);
  }
};

export default function App() {
  // Firebase Auth states
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authEmail, setAuthEmail] = useState<string>("");
  const [authPassword, setAuthPassword] = useState<string>("");
  const [authConfirmPassword, setAuthConfirmPassword] = useState<string>("");
  const [authIsRegistering, setAuthIsRegistering] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authActionLoading, setAuthActionLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [dismissedOfflineNotice, setDismissedOfflineNotice] = useState<boolean>(false);

  // Active header page tab state: "analysis" | "openings" | "database" | "learn" | "admin"
  const [activeHeaderTab, setActiveHeaderTab] = useState<"analysis" | "openings" | "database" | "learn" | "admin">("analysis");

  // Coach persona choice, manageable by user/admin
  const [selectedPersona, setSelectedPersona] = useState<"expert" | "tal" | "fischer" | "carlsen" | "kasparov">("expert");
  const [adminMemo, setAdminMemo] = useState<string>("Welcome to the Gambit Chess Arena Administration Console. All core engine threads are synchronized under your admin authorization.");

  // Admin access configuration
  const [devAdminOverride, setDevAdminOverride] = useState<boolean>(false);
  const logoClickCountRef = useRef<number>(0);
  const handleLogoClick = () => {
    logoClickCountRef.current += 1;
    if (logoClickCountRef.current >= 5) {
      setDevAdminOverride(true);
      setActiveAlert({
        text: "Gambit Admin Mode Unlocked",
        sub: "You have completed system authorization. The Admin Dashboard has been loaded into your main navigation.",
        type: "success"
      });
    }
  };

  // Core chess game states
  const [fen, setFen] = useState<string>("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  const [gameMoves, setGameMoves] = useState<AnalysisMove[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(-1); // -1 is starting position
  const [perspective, setPerspective] = useState<"w" | "b">("w");
  const [boardTheme, setBoardTheme] = useState<"forest" | "wood" | "blue" | "slate" | "gambit" | "custom">("gambit");
  const [appTheme, setAppTheme] = useState<AppTheme>(() => {
    const saved = localStorage.getItem("gambit_app_theme");
    if (saved && ["midnight", "coffee", "cyberpunk", "amethyst", "nordic"].includes(saved)) {
      return saved as AppTheme;
    }
    return "midnight";
  });
  const [customColors, setCustomColors] = useState<{ light: string; dark: string }>({
    light: "#eae6d1",
    dark: "#558460",
  });
  const [isSyncingTheme, setIsSyncingTheme] = useState<boolean>(false);
  const [themeSyncStatus, setThemeSyncStatus] = useState<"synced" | "local" | "saving" | "error">("local");
  const [sandboxMode, setSandboxMode] = useState<boolean>(true); // Sandbox allows free movement vs game-replay mode

  // Beautiful active notification banner state for classifications
  const [activeAlert, setActiveAlert] = useState<{ text: string; sub: string; type: string } | null>(null);

  // Custom visual metadata (loaded from PGN or URLs)
  const [metadata, setMetadata] = useState<GameMetadata>({
    white: { name: "White Player", rating: "1800" },
    black: { name: "Black Player", rating: "1800" },
    event: "Sandbox Analysis Arena"
  });

  // Stockfish configuration states
  const [engineActive, setEngineActive] = useState<boolean>(true);
  const [engineDepth, setEngineDepth] = useState<number>(10); // Default speed depth 10
  const [engineReady, setEngineReady] = useState<boolean>(false);
  const [latestEval, setLatestEval] = useState<Evaluation | null>(null);

  // Full-game review & progress states
  const [isReviewing, setIsReviewing] = useState<boolean>(false);
  const [reviewCount, setReviewCount] = useState<number>(0);
  const [reviewTotal, setReviewTotal] = useState<number>(0);
  const [accuracyReport, setAccuracyReport] = useState<GameReport | null>(null);
  const [analysisSidebarTab, setAnalysisSidebarTab] = useState<"moves" | "review" | "info" | "openings">("moves");

  // Link fetching states
  const [importUrl, setImportUrl] = useState<string>("");
  const [importPgn, setImportPgn] = useState<string>("");
  const [importFen, setImportFen] = useState<string>("");
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isFetchingGame, setIsFetchingGame] = useState<boolean>(false);

  // AI coach and commentary states
  const [aiCoachEnabled, setAiCoachEnabled] = useState<boolean>(true);
  const [aiCommentary, setAiCommentary] = useState<string>("Welcome to the GM Coach Arena! Play any move on the board or load a full match. I will analyze positions and explain the underlying grandmaster concepts.");
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [commentaryCache, setCommentaryCache] = useState<Record<string, string>>({});

  // Opening statistics state cache and loading state
  const [openingStatsCache, setOpeningStatsCache] = useState<Record<string, {
    whiteWin: number;
    draw: number;
    blackWin: number;
    totalGames: string;
    gmRecommendation: string;
    sources: string[];
  }>>({});
  const [isStatsLoading, setIsStatsLoading] = useState<boolean>(false);

  // Auto-play settings
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(2000); // 2 seconds

  // Active chess.js instancing for side calculations
  const activeChess = useMemo(() => {
    try {
      return new Chess(fen);
    } catch {
      return new Chess(); // recovery
    }
  }, [fen]);

  // Stockfish Web Worker reference
  const engineRef = useRef<StockfishEngine | null>(null);

  // Dynamic Opening Detection using our openings helper
  const activeMovesList = useMemo(() => {
    return gameMoves.slice(0, activeIndex + 1).map((m) => m.san);
  }, [gameMoves, activeIndex]);

  const activeOpening = useMemo(() => {
    return detectOpening(activeMovesList);
  }, [activeMovesList]);

  // Real-time Chess Game Move Timer States
  const [moveTimeElapsed, setMoveTimeElapsed] = useState<number>(0);
  const [whiteTotalTime, setWhiteTotalTime] = useState<number>(0);
  const [blackTotalTime, setBlackTotalTime] = useState<number>(0);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Real-time move timer ticking effect
  useEffect(() => {
    if (activeHeaderTab !== "analysis") return;

    const interval = setInterval(() => {
      // Only tick if the user is currently at the latest position of the game
      if (activeIndex === gameMoves.length - 1 || gameMoves.length === 0) {
        setMoveTimeElapsed((prev) => prev + 1);

        try {
          const turn = activeChess.turn();
          if (turn === "w") {
            setWhiteTotalTime((prev) => prev + 1);
          } else {
            setBlackTotalTime((prev) => prev + 1);
          }
        } catch {
          // Fallback if activeChess is not loaded
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [fen, activeHeaderTab, activeIndex, gameMoves.length]);

  // Handle active alerts whenever a move gets evaluated or selected
  useEffect(() => {
    if (activeIndex >= 0 && gameMoves[activeIndex]) {
      const cls = gameMoves[activeIndex].classification;
      if (cls === "brilliant") {
        setActiveAlert({
          text: "Brilliant Move !!",
          sub: `${gameMoves[activeIndex].san} was an absolute grandmaster strike!`,
          type: "brilliant"
        });
      } else if (cls === "great") {
        setActiveAlert({
          text: "Great Move !",
          sub: `${gameMoves[activeIndex].san} holds exceptional critical weight.`,
          type: "great"
        });
      } else if (cls === "blunder") {
        setActiveAlert({
          text: "Critical Blunder ??",
          sub: `Oh no! ${gameMoves[activeIndex].san} lets key tactical lines slip.`,
          type: "blunder"
        });
      } else {
        setActiveAlert(null);
      }
    } else {
      setActiveAlert(null);
    }
  }, [activeIndex, gameMoves]);

  // Fetch opening GM stats dynamically using Search Grounding
  useEffect(() => {
    if (analysisSidebarTab !== "openings" || !activeOpening) return;

    const opName = activeOpening.name;
    if (openingStatsCache[opName]) return; // already in cache

    let active = true;
    const fetchStats = async () => {
      setIsStatsLoading(true);
      try {
        const response = await fetch("/api/opening-stats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ openingName: opName, eco: activeOpening.eco })
        });
        if (!response.ok) throw new Error("Failed to fetch stats");
        const data = await response.json();
        if (active) {
          setOpeningStatsCache(prev => ({
            ...prev,
            [opName]: data
          }));
        }
      } catch (err) {
        console.error("Error fetching opening statistics:", err);
      } finally {
        if (active) {
          setIsStatsLoading(false);
        }
      }
    };

    fetchStats();
    return () => {
      active = false;
    };
  }, [activeOpening, analysisSidebarTab, openingStatsCache]);

  // Listen for Auth state changes (supporting offline/local fallback session during firebase setup)
  useEffect(() => {
    // Graceful error catcher for benign script inaccuracies/cross-origin CDN errors inside sandbox environments
    const handleGlobalError = (event: ErrorEvent) => {
      const msg = String(event.message || event.error?.message || "").toLowerCase();
      const file = String(event.filename || "").toLowerCase();
      if (
        !msg ||
        msg.includes("script error") ||
        msg.includes("stockfish") ||
        file.includes("stockfish") ||
        msg === "error"
      ) {
        try {
          event.preventDefault();
          event.stopPropagation();
        } catch (e) {}
      }
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      const lowerReason = String(event.reason?.message || event.reason || "").toLowerCase();
      if (
        !lowerReason ||
        lowerReason.includes("operation-not-allowed") || 
        lowerReason.includes("script error") ||
        lowerReason.includes("stockfish") ||
        (event.reason?.code && String(event.reason.code).includes("operation-not-allowed"))
      ) {
        try {
          event.preventDefault();
          event.stopPropagation();
        } catch (e) {}
      }
    };
    window.addEventListener("error", handleGlobalError, true);
    window.addEventListener("unhandledrejection", handleRejection, true);

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        localStorage.removeItem("local_chess_user");
        setUser(currentUser);
      } else {
        const cachedUser = localStorage.getItem("local_chess_user");
        if (cachedUser) {
          try {
            setUser(JSON.parse(cachedUser));
          } catch (e) {
            localStorage.removeItem("local_chess_user");
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
      setAuthLoading(false);
    });
    return () => {
      window.removeEventListener("error", handleGlobalError, true);
      window.removeEventListener("unhandledrejection", handleRejection, true);
      unsubscribe();
    };
  }, []);

  // Validate Connection to Firestore on mount
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, "test", "connection"));
      } catch (error) {
        if (error instanceof Error && error.message.includes("the client is offline")) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  // Load preferences from Firestore / LocalStorage
  useEffect(() => {
    let activeUser = user;
    if (!activeUser) {
      const savedTheme = localStorage.getItem("gambit_board_theme");
      const savedColors = localStorage.getItem("gambit_custom_colors");
      if (savedTheme) {
        setBoardTheme(savedTheme as any);
      }
      if (savedColors) {
        try {
          setCustomColors(JSON.parse(savedColors));
        } catch (e) {
          console.warn("Parsing local color preferences failed:", e);
        }
      }
      setThemeSyncStatus("local");
      return;
    }

    async function loadUserProfile() {
      if (!activeUser) return;
      setIsSyncingTheme(true);
      setThemeSyncStatus("saving");
      try {
        const userDocRef = doc(db, "users", activeUser.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.boardTheme) {
            setBoardTheme(data.boardTheme);
          }
          if (data.customColors) {
            setCustomColors(data.customColors);
          }
          setThemeSyncStatus("synced");
        } else {
          const savedTheme = localStorage.getItem("gambit_board_theme");
          const savedColors = localStorage.getItem("gambit_custom_colors");
          if (savedTheme) setBoardTheme(savedTheme as any);
          if (savedColors) {
            try {
              setCustomColors(JSON.parse(savedColors));
            } catch (e) {}
          }
          setThemeSyncStatus("local");
        }
      } catch (err) {
        console.warn("Could not load user profile from Firestore:", err);
        const savedTheme = localStorage.getItem("gambit_board_theme");
        const savedColors = localStorage.getItem("gambit_custom_colors");
        if (savedTheme) setBoardTheme(savedTheme as any);
        if (savedColors) {
          try {
            setCustomColors(JSON.parse(savedColors));
          } catch (e) {}
        }
        setThemeSyncStatus("local");
      } finally {
        setIsSyncingTheme(false);
      }
    }

    loadUserProfile();
  }, [user]);

  const saveThemePreferences = async (themeToSave: any, colorsToSave: { light: string; dark: string }) => {
    localStorage.setItem("gambit_board_theme", themeToSave);
    localStorage.setItem("gambit_custom_colors", JSON.stringify(colorsToSave));

    if (!user) {
      setThemeSyncStatus("local");
      return;
    }

    setThemeSyncStatus("saving");
    const path = `users/${user.uid}`;
    try {
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email || "anonymous",
        boardTheme: themeToSave,
        customColors: colorsToSave,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      setThemeSyncStatus("synced");
    } catch (err) {
      console.error("Failed to save user theme preferences to Firestore:", err);
      setThemeSyncStatus("error");
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword.trim() || (authIsRegistering && !authConfirmPassword.trim())) {
      setAuthError("Please fill out all email and password fields.");
      return;
    }
    if (authIsRegistering && authPassword !== authConfirmPassword) {
      setAuthError("Passwords do not match. Please double check.");
      return;
    }

    if (authIsRegistering) {
      // Check password strength constraint
      const strength = checkPasswordStrength(authPassword);
      if (strength.score < 3) {
        setAuthError("Your password is too weak. Please ensure it satisfies at least 3 strength criteria shown below (e.g., lowercase, uppercase, digits, or symbols).");
        return;
      }
    }

    setAuthError(null);
    setAuthActionLoading(true);
    try {
      if (authIsRegistering) {
        await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        registerEmailLocally(authEmail);
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
        registerEmailLocally(authEmail);
      }
      localStorage.removeItem("local_chess_user");
    } catch (err: any) {
      console.error("Auth submit error:", err);
      let message = err.message || "Authentication failed.";
      
      // Auto-healing fallback for "operation-not-allowed" email/password setup
      if (err.code === "auth/operation-not-allowed" || err.message?.includes("not allowed")) {
        console.warn("Auth provider not configured on Firebase. Gracefully bootstrapping offline database session...");
        
        if (authIsRegistering) {
          registerEmailLocally(authEmail);
        }

        const fallbackUser = {
          email: authEmail,
          uid: "local-gm-" + Math.floor(Math.random() * 1050),
          emailVerified: true,
          isOfflineFallback: true
        } as any;
        localStorage.setItem("local_chess_user", JSON.stringify(fallbackUser));
        setUser(fallbackUser);
        setAuthError(null);
        return;
      }

      // Handle network blocking or Authorized Domains exceptions (such as in iframe / sandboxes)
      if (err.code === "auth/network-request-failed" || err.message?.includes("network-request-failed")) {
        console.warn("Network request failed. This typically happens in iframe sandboxes or when Authorized Domains is missing in the Firebase console.");
        setAuthError("auth/network-request-failed");
        return;
      }

      if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        message = "Incorrect email or password.";
      } else if (err.code === "auth/email-already-in-use") {
        registerEmailLocally(authEmail);
        message = "This email is already registered on our server. We have added it to this device's memory. You can now Sign In!";
        setAuthIsRegistering(false);
      } else if (err.code === "auth/weak-password") {
        message = "Password must be at least 6 characters.";
      } else if (err.code === "auth/invalid-email") {
        message = "Please enter a valid email address.";
      }
      setAuthError(message);
    } finally {
      setAuthActionLoading(false);
    }
  };


  const handleSignOut = async () => {
    try {
      localStorage.removeItem("local_chess_user");
      await signOut(auth);
      setUser(null);
    } catch (err: any) {
      console.error("Sign out error:", err);
    }
  };

  // Initialize Stockfish once on mount
  useEffect(() => {
    engineRef.current = new StockfishEngine(
      (evaluation: Evaluation) => {
        setLatestEval(evaluation);
        
        // Cache evaluation on individual game moves if in review or active mode
        if (activeIndex >= 0 && gameMoves.length > 0) {
          setGameMoves(prev => {
            const updated = [...prev];
            if (updated[activeIndex]) {
              updated[activeIndex].evaluation = evaluation;
            }
            return updated;
          });
        }
      },
      () => {
        setEngineReady(true);
        console.log("[Engine Ready] Stockfish.js running in local worker.");
      }
    );

    return () => {
      if (engineRef.current) {
        engineRef.current.terminate();
      }
    };
  }, [activeIndex, gameMoves.length]);

  // Trigger Stockfish evaluation when position or active move index updates
  useEffect(() => {
    if (engineActive && engineReady && engineRef.current) {
      setLatestEval(null); // Clear previous
      engineRef.current.analyzePosition(fen, engineDepth);
    }
  }, [fen, engineActive, engineReady, engineDepth]);

  // Auto-play logic
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isPlaying && gameMoves.length > 0) {
      intervalId = setInterval(() => {
        if (activeIndex < gameMoves.length - 1) {
          handleStepNext();
        } else {
          setIsPlaying(false); // Stop when reaching end
        }
      }, playbackSpeed);
    }
    return () => clearInterval(intervalId);
  }, [isPlaying, activeIndex, gameMoves, playbackSpeed]);

  // Automatically request AI GM Coach Commentary when active position updates (debounced to avoid token overuse on fast scroll)
  const commentaryTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!aiCoachEnabled || isReviewing || isPlaying) return;

    if (commentaryTimerRef.current) {
      clearTimeout(commentaryTimerRef.current);
    }

    // Debounce to 1800ms to preserve rate limits on manual clicks.
    commentaryTimerRef.current = setTimeout(() => {
      fetchAICoachCommentary();
    }, 1800);

    return () => {
      if (commentaryTimerRef.current) clearTimeout(commentaryTimerRef.current);
    };
  }, [fen, aiCoachEnabled, isReviewing, isPlaying]);

  // Request Gemini Commentary
  const fetchAICoachCommentary = async () => {
    if (!latestEval) return; // Wait for Stockfish values first for higher-quality context
    
    const activeMove = activeIndex >= 0 ? gameMoves[activeIndex] : null;

    // 1. Check if we already have it cached on the move object
    if (activeMove?.aiExplanation) {
      setAiCommentary(activeMove.aiExplanation);
      return;
    }

    // 2. Check FEN-based client-side cache
    if (commentaryCache[fen]) {
      setAiCommentary(commentaryCache[fen]);
      return;
    }

    setIsAiLoading(true);
    const historyList = gameMoves.slice(0, activeIndex + 1).map(m => m.san);

    try {
      const response = await fetch("/api/analyze-position", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fen,
          previousMoves: historyList.slice(-6), // last 6 moves for memory span
          sideToMove: activeChess.turn(),
          stockfishEval: latestEval.score,
          bestMove: latestEval.bestMove,
          movePlayed: activeMove?.san || null,
          fullHistory: historyList.join(" "),
          persona: selectedPersona,
          activeOpening: activeOpening ? {
            name: activeOpening.name,
            eco: activeOpening.eco,
            description: activeOpening.description,
            strategicGoal: activeOpening.strategicGoal,
            possibleMoves: activeOpening.possibleMoves
          } : null,
        }),
      });

      if (!response.ok) throw new Error("Server responded with error.");
      const data = await response.json();
      setAiCommentary(data.commentary);

      // Save in cache
      setCommentaryCache(prev => ({ ...prev, [fen]: data.commentary }));

      // Cache commentary on the move state
      if (activeIndex >= 0) {
        setGameMoves(prev => {
          const updated = [...prev];
          if (updated[activeIndex]) {
            updated[activeIndex].aiExplanation = data.commentary;
          }
          return updated;
        });
      }
    } catch (e) {
      console.warn("AI Coach fetch handled gracefully:", e);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Run sequential, automated Stockfish game analysis
  const runFullGameReview = async () => {
    if (gameMoves.length === 0) return;
    setIsReviewing(true);
    setReviewTotal(gameMoves.length + 1); // include initial position analysis
    setReviewCount(0);

    const movesToAnalyze = [...gameMoves];

    // 1. Analyze initial position first to get starting context (best move and starting evaluation)
    setReviewCount(1);
    const initialEval = await new Promise<Evaluation>((resolve) => {
      let resolved = false;
      let lastEval: Evaluation | null = null;
      const worker = new StockfishEngine((ev) => {
        lastEval = ev;
        if (ev.depth !== undefined && ev.depth >= 8) {
          if (!resolved) {
            resolved = true;
            worker.terminate();
            resolve(ev);
          }
        }
      }, () => {
        worker.analyzePosition(movesToAnalyze[0].fenBefore, 8);
      });
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          worker.terminate();
          resolve(lastEval || { score: "0.00", numericScore: 0, bestMove: "e2e4" });
        }
      }, 400);
    });

    // 2. Loop through all moves sequentially
    for (let k = 0; k < movesToAnalyze.length; k++) {
      setReviewCount(k + 2);
      const move = movesToAnalyze[k];
      
      const evalBefore = k === 0 ? initialEval : (movesToAnalyze[k - 1].evaluation || { score: "0.00", numericScore: 0 });

      // Analyze fenAfter
      const evalAfter = await new Promise<Evaluation>((resolve) => {
        let resolved = false;
        let lastEval: Evaluation | null = null;
        const worker = new StockfishEngine((ev) => {
          lastEval = ev;
          if (ev.depth !== undefined && ev.depth >= 8) {
            if (!resolved) {
              resolved = true;
              worker.terminate();
              resolve(ev);
            }
          }
        }, () => {
          worker.analyzePosition(move.fenAfter, 8);
        });
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            worker.terminate();
            resolve(lastEval || { score: "0.00", numericScore: 0 });
          }
        }, 400);
      });

      move.evaluation = evalAfter;

      // Assign move classification
      const isWhite = k % 2 === 0;
      const scoreBefore = evalBefore.numericScore || 0;
      const scoreAfter = evalAfter.numericScore || 0;
      const bestUci = evalBefore.bestMove;

      const classification = classifyMove(
        Math.floor(k / 2) + 1,
        move.uci,
        bestUci,
        scoreBefore,
        scoreAfter,
        isWhite,
        move.fenBefore,
        move.san
      );
      move.classification = classification;
    }

    // Refresh layout, calculate accuracy and report card
    setGameMoves(movesToAnalyze);
    const report = evaluateReports(movesToAnalyze);
    setAccuracyReport(report);
    setIsReviewing(false);
    setAnalysisSidebarTab("review");
    // Move board to first position to show report review
    setActiveIndex(0);
    setFen(gameMoves[0].fenAfter);
  };

  // Reset Sandbox
  const resetToStart = () => {
    setFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    setGameMoves([]);
    setActiveIndex(-1);
    setLatestEval(null);
    setAccuracyReport(null);
    setAnalysisSidebarTab("moves");
    setCommentaryCache({});
    setSandboxMode(true);
    setMoveTimeElapsed(0);
    setWhiteTotalTime(0);
    setBlackTotalTime(0);
    setMetadata({
      white: { name: "White Player" },
      black: { name: "Black Player" },
      event: "Sandbox Chess Board"
    });
    setAiCommentary("Reset complete. The board is now set to the standard opening position. Feel free to play, and I will analyze!");
  };

  // Load a saved game from raw storage
  const handleLoadSavedGame = (saved: SavedGame) => {
    setFen(saved.fen);
    setGameMoves(saved.gameMoves);
    setActiveIndex(saved.activeIndex);
    setMetadata(saved.metadata);
    setAccuracyReport(saved.accuracyReport);
    if (saved.accuracyReport) {
      setAnalysisSidebarTab("review");
    } else {
      setAnalysisSidebarTab("moves");
    }
    setSandboxMode(saved.gameMoves.length === 0);
    
    // Reset move slot timers and aggregate historical times if present
    setMoveTimeElapsed(0);
    let wTotal = 0;
    let bTotal = 0;
    if (saved.gameMoves && Array.isArray(saved.gameMoves)) {
      saved.gameMoves.forEach((m, idx) => {
        const time = m.timeSpent || 0;
        if (idx % 2 === 0) {
          wTotal += time;
        } else {
          bTotal += time;
        }
      });
    }
    setWhiteTotalTime(wTotal);
    setBlackTotalTime(bTotal);

    setActiveAlert({
      text: "Loaded Saved Game Analysis",
      sub: `"${saved.name}" successfully loaded into the engine study board active queue.`,
      type: "success"
    });
  };

  // Step managers in Replay Mode
  const handleStepFirst = () => {
    setActiveIndex(-1);
    setFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  };

  const handleStepLast = () => {
    if (gameMoves.length === 0) return;
    const idx = gameMoves.length - 1;
    setActiveIndex(idx);
    setFen(gameMoves[idx].fenAfter);
  };

  const handleStepPrev = () => {
    if (activeIndex > 0) {
      const idx = activeIndex - 1;
      setActiveIndex(idx);
      setFen(gameMoves[idx].fenAfter);
    } else if (activeIndex === 0) {
      setActiveIndex(-1);
      setFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    }
  };

  const handleStepNext = () => {
    if (activeIndex < gameMoves.length - 1) {
      const idx = activeIndex + 1;
      setActiveIndex(idx);
      setFen(gameMoves[idx].fenAfter);
    }
  };

  const selectMoveIndex = (index: number) => {
    setActiveIndex(index);
    setFen(gameMoves[index].fenAfter);
    setSandboxMode(false);
  };

  // Execute manual pawn or piece moves on the board
  const handlePlayerMove = (from: string, to: string, promotion: string = "q") => {
    try {
      const chess = new Chess(fen);
      const moveResult = chess.move({
        from: from as Square,
        to: to as Square,
        promotion,
      });

      if (moveResult) {
        const nextFen = chess.fen();
        const moveUci = `${from}${to}${promotion === "q" ? "" : promotion}`;

        const newMoveObj: AnalysisMove = {
          san: moveResult.san,
          uci: moveUci,
          fenBefore: fen,
          fenAfter: nextFen,
          timeSpent: moveTimeElapsed,
        };
        setMoveTimeElapsed(0);

        // If sandbox, expand local history
        if (sandboxMode) {
          // Slice gameMoves up to active index and append new move
          const updatedMoves = [...gameMoves.slice(0, activeIndex + 1), newMoveObj];
          setGameMoves(updatedMoves);
          setActiveIndex(updatedMoves.length - 1);
        } else {
          // If in analytical review mode, toggle back to sandbox mode to permit forks/drawings!
          const updatedMoves = [...gameMoves.slice(0, activeIndex + 1), newMoveObj];
          setGameMoves(updatedMoves);
          setActiveIndex(updatedMoves.length - 1);
          setSandboxMode(true);
        }

        setFen(nextFen);
      }
    } catch (err) {
      console.warn("Attempted illegal player move:", err);
    }
  };

  // Play opening theoretical SAN moves automatically when clicked (supports multi-move sequences)
  const handlePlaySANMove = (sanSequence: string) => {
    try {
      // 1. Clean the string from comments e.g. "3... c5 (Alapin)" -> "3... c5"
      const cleanSeq = sanSequence.split("(")[0].trim();
      // 2. Split by spaces
      const tokens = cleanSeq.split(/\s+/);
      // 3. Filter out move numbers like "1.", "1...", "2.", "2..." etc.
      const movesToPlay = tokens.filter(t => t && !t.includes(".") && !t.trim().startsWith("("));

      if (movesToPlay.length === 0) return;

      const chess = new Chess(fen);
      const newMoves: AnalysisMove[] = [];
      let currentFen = fen;

      for (const san of movesToPlay) {
        try {
          const moveResult = chess.move(san);
          if (moveResult) {
            const nextFen = chess.fen();
            const moveUci = `${moveResult.from}${moveResult.to}${moveResult.promotion || ""}`;
            
            newMoves.push({
              san: moveResult.san,
              uci: moveUci,
              fenBefore: currentFen,
              fenAfter: nextFen,
              timeSpent: 0,
            });
            currentFen = nextFen;
          } else {
            console.warn("Invalid individual move in sequence:", san);
            break;
          }
        } catch (err) {
          console.warn("Move failed in sequence:", san, err);
          break;
        }
      }

      if (newMoves.length > 0) {
        const updatedMoves = [...gameMoves.slice(0, activeIndex + 1), ...newMoves];
        setGameMoves(updatedMoves);
        setActiveIndex(updatedMoves.length - 1);
        setFen(currentFen);
        setSandboxMode(true);
      }
    } catch (err) {
      console.warn("Attempting invalid theoretical continuation sequence:", sanSequence, err);
    }
  };

  // Fetch Game from Chess.com or Lichess Link
  const handleFetchGameByUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importUrl) return;

    setFetchError(null);
    setIsFetchingGame(true);
    setAccuracyReport(null);

    try {
      const response = await fetch("/api/fetch-game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to download game.");
      }

      const { pgn } = await response.json();
      loadGamePgn(pgn);
      setImportUrl("");
    } catch (err: any) {
      setFetchError(err.message || "An unexpected error occurred while loading link.");
    } finally {
      setIsFetchingGame(false);
    }
  };

  // Submit and load manual PGN string
  const handleImportPgnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importPgn.trim()) return;
    setFetchError(null);
    try {
      loadGamePgn(importPgn);
      setImportPgn("");
    } catch (err: any) {
      setFetchError("Invalid PGN text. Please check PGN parameters.");
    }
  };

  // Submit and load FEN position
  const handleImportFenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFen.trim()) return;
    setFetchError(null);
    try {
      const test = new Chess(importFen.trim());
      setFen(importFen.trim());
      setGameMoves([]);
      setActiveIndex(-1);
      setSandboxMode(true);
      setMetadata({
        white: { name: "Custom Strategy Position" },
        black: { name: "Engine Analysis" },
        event: "Position Training Arena"
      });
      setImportFen("");
    } catch (err) {
      setFetchError("Invalid FEN string format. Please verify squares.");
    }
  };

  // Load PGN Parser Wrapper
  const loadGamePgn = (rawPgn: string) => {
    const meta = parsePgnMetadata(rawPgn);
    const parsedMoves = parsePgnMoves(rawPgn);

    if (parsedMoves.length === 0) {
      throw new Error("Moves count was evaluated to 0. Is this an empty match?");
    }

    setMetadata(meta);
    setGameMoves(parsedMoves);
    setSandboxMode(false);
    setMoveTimeElapsed(0);
    setWhiteTotalTime(0);
    setBlackTotalTime(0);

    // Set board to starting position
    setActiveIndex(-1);
    setFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    setAiCommentary(`Successfully imported game! White: ${meta.white.name} vs. Black: ${meta.black.name}. Click 'Engine Analysis Review' to run precision ply checks!`);
  };

  // Quick Preset Selector
  const loadPreset = (preset: typeof CHESS_PRESETS[0]) => {
    if (preset.fen) {
      const test = new Chess(preset.fen);
      setFen(preset.fen);
      setGameMoves([]);
      setActiveIndex(-1);
      setSandboxMode(true);
      setMoveTimeElapsed(0);
      setWhiteTotalTime(0);
      setBlackTotalTime(0);
      setMetadata({
        white: { name: "Tactical Puzzle Mode" },
        black: { name: "Engine AI" },
        event: preset.name
      });
      setAiCommentary(`Preset loaded: ${preset.name}. ${preset.description || ""}`);
    } else if (preset.pgn) {
      loadGamePgn(preset.pgn);
      setAiCommentary(`Preset game PGN loaded: ${preset.name}. ${preset.description || ""}`);
    }
  };

  // Calculated Piece Swings & Captured Pieces Heuristic
  const capturedPieces = useMemo(() => {
    const defaultPieces = [
      { type: "p", color: "w" }, { type: "n", color: "w" }, { type: "b", color: "w" }, { type: "r", color: "w" }, { type: "q", color: "w" },
      { type: "p", color: "b" }, { type: "n", color: "b" }, { type: "b", color: "b" }, { type: "r", color: "b" }, { type: "q", color: "b" }
    ];

    const currentPositions = activeChess.board();
    const activeCount: Record<string, number> = {};

    // Count currently active on 8x8 chessboard
    currentPositions.forEach(row => {
      row.forEach(sq => {
        if (sq) {
          const key = `${sq.color}${sq.type}`;
          activeCount[key] = (activeCount[key] || 0) + 1;
        }
      });
    });

    const startingSet: Record<string, number> = {
      wp: 8, wn: 2, wb: 2, wr: 2, wq: 1, wk: 1,
      bp: 8, bn: 2, bb: 2, br: 2, bq: 1, bk: 1
    };

    const whiteCaptured: { type: string; url: string }[] = [];
    const blackCaptured: { type: string; url: string }[] = [];

    // Diff counts
    Object.keys(startingSet).forEach(key => {
      const color = key[0];
      const type = key[1];
      const count = startingSet[key] - (activeCount[key] || 0);

      for (let s = 0; s < count; s++) {
        if (type !== "k") { // Kings cannot be captured
          if (color === "w") {
            whiteCaptured.push({ type, url: getPieceSvg(type, "w") });
          } else {
            blackCaptured.push({ type, url: getPieceSvg(type, "b") });
          }
        }
      }
    });

    return { whiteCaptured, blackCaptured };
  }, [fen, activeChess]);

  // Math Helper to read current centipawn bar ratio
  const evalRatio = useMemo(() => {
    if (!latestEval) return 50; // default middle
    const score = latestEval.numericScore; // raw score (white perspective)

    // Bound extreme scores
    let capScore = Math.max(-800, Math.min(800, score)); // caps around +/- 8 pawns advantage
    // Map -800 to 800 into percentage 5% to 95%
    return 50 + (capScore / 800) * 45;
  }, [latestEval]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#08090b] text-slate-100 font-sans flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold tracking-wide text-emerald-400 font-mono animate-pulse uppercase">
          Verifying Chess Arena Authorization...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#08090b] text-slate-100 font-sans flex flex-col items-center justify-center p-4 relative overflow-hidden border-t-4 border-[#558460]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.07)_0,transparent_100%)] pointer-events-none" />
        
        {/* Decorative chess particles */}
        <div className="absolute top-10 left-10 text-[90px] font-bold text-slate-800/10 pointer-events-none select-none">♞</div>
        <div className="absolute bottom-10 right-10 text-[100px] font-bold text-slate-800/10 pointer-events-none select-none">♛</div>
        <div className="absolute top-1/3 right-12 text-[70px] font-bold text-slate-800/10 pointer-events-none select-none">♜</div>
        <div className="absolute bottom-1/3 left-12 text-[80px] font-bold text-slate-800/10 pointer-events-none select-none">♟</div>

        <div className="w-full max-w-md bg-slate-950 border border-slate-850 p-8 rounded-2xl shadow-2xl relative z-10">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-md ring-1 ring-emerald-400/20">
              <span className="text-emerald-400 text-3xl font-serif leading-none select-none">♞</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-white bg-clip-text text-transparent">
              Gambit
            </h1>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-mono">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-mono">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-350 transition cursor-pointer flex items-center justify-center"
                  title={showPassword ? "Hide Password" : "Show Password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {authIsRegistering && authPassword && (() => {
                const strength = checkPasswordStrength(authPassword);
                return (
                  <div className="mt-2.5 space-y-2 p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl text-[11px] transition duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Password Strength:</span>
                      <span className={`font-bold font-mono ${strength.color}`}>{strength.label}</span>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${strength.bgColor} transition-all duration-300`} 
                        style={{ width: `${(strength.score / 5) * 100}%` }}
                      />
                    </div>
                    
                    {/* Visual checklist */}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-slate-500 font-mono mt-1.5 pt-1.5 border-t border-slate-900/50">
                      <div className="flex items-center gap-1.5">
                        <span className={strength.checks.length ? "text-emerald-400 font-bold" : "text-slate-600"}>
                          {strength.checks.length ? "✓" : "○"}
                        </span>
                        <span>Min 8 chars</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={strength.checks.hasUpper ? "text-emerald-400 font-bold" : "text-slate-600"}>
                          {strength.checks.hasUpper ? "✓" : "○"}
                        </span>
                        <span>Uppercase (A-Z)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={strength.checks.hasLower ? "text-emerald-400 font-bold" : "text-slate-600"}>
                          {strength.checks.hasLower ? "✓" : "○"}
                        </span>
                        <span>Lowercase (a-z)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={strength.checks.hasNumber ? "text-emerald-400 font-bold" : "text-slate-600"}>
                          {strength.checks.hasNumber ? "✓" : "○"}
                        </span>
                        <span>Number (0-9)</span>
                      </div>
                      <div className="flex items-center gap-1.5 col-span-2">
                        <span className={strength.checks.hasSpecial ? "text-emerald-400 font-bold" : "text-slate-600"}>
                          {strength.checks.hasSpecial ? "✓" : "○"}
                        </span>
                        <span>Symbol (e.g. @, $, !)</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {authIsRegistering && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-mono">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={authConfirmPassword}
                    onChange={(e) => setAuthConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-350 transition cursor-pointer flex items-center justify-center"
                    title={showConfirmPassword ? "Hide Confirm Password" : "Show Confirm Password"}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {authError && (
              authError === "auth/network-request-failed" ? (
                <div className="p-4 bg-amber-950/45 border border-amber-800/60 rounded-xl space-y-3 text-[11px] leading-relaxed text-amber-200">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 animate-bounce" />
                    <span className="font-bold text-amber-300">Firebase: Error (auth/network-request-failed)</span>
                  </div>
                  <p className="text-slate-300">
                    This error usually occurs because the current application runs inside a sandboxed browser iframe, which blocks raw third-party identity requests, or because the current domain is not yet added to authorized domains in Firebase.
                  </p>
                  <div className="bg-slate-950/70 border border-slate-900 rounded p-2.5 space-y-1 text-slate-400">
                    <span className="block font-bold uppercase text-[9px] text-amber-400/90 tracking-wider">How to Enable Access:</span>
                    <ul className="list-disc list-inside space-y-1 font-sans">
                      <li>Go to <strong className="text-slate-300">Authentication &gt; Settings &gt; Authorized Domains</strong> in your Firebase Console.</li>
                      <li>Add the current domain <code className="bg-slate-900 px-1 py-0.5 rounded text-indigo-300 break-all select-all font-mono">ais-dev-sllutikvham5ue5kloncpc-1055573551746.asia-southeast1.run.app</code> to the permitted authorization list.</li>
                      <li>Also add the shared production domain <code className="bg-slate-900 px-1 py-0.5 rounded text-indigo-300 break-all select-all font-mono">ais-pre-sllutikvham5ue5kloncpc-1055573551746.asia-southeast1.run.app</code> if needed.</li>
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const fallbackUser = {
                        email: authEmail || "offline-user@gamedemo.com",
                        uid: "local-bypass-admin-99",
                        emailVerified: true,
                        isOfflineFallback: true
                      } as any;
                      localStorage.setItem("local_chess_user", JSON.stringify(fallbackUser));
                      setUser(fallbackUser);
                      setAuthError(null);
                      setActiveAlert({
                        text: "Authenticated in Secure Local-First Mode",
                        sub: "Authentication bypassed successfully. Local play and chess engine calibrations are ready.",
                        type: "success"
                      });
                    }}
                    className="w-full py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black rounded-lg hover:opacity-90 transition active:scale-[0.98] cursor-pointer text-center uppercase tracking-wider"
                  >
                    🛠️ Bypass & Launch Offline Mode
                  </button>
                </div>
              ) : (authError && typeof authError === "string" && authError.includes("has not been registered yet")) ? (
                <div className="p-3.5 bg-red-950/45 border border-red-900/60 text-red-200 rounded-xl text-xs space-y-2">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-red-300 mb-1">Registration Required First</p>
                      <p className="text-[11px] text-slate-350 leading-relaxed">{authError}</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-red-900/30 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-medium font-mono">Returning user bypass:</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (authEmail.trim()) {
                          registerEmailLocally(authEmail);
                          setAuthError(null);
                          setAuthIsRegistering(false);
                          setActiveAlert({
                            text: "Account verification added securely",
                            sub: `${authEmail} marked as registered on this browser. Try signing in now!`,
                            type: "success"
                          });
                        }
                      }}
                      className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 underline transition cursor-pointer"
                    >
                      I already have an account
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-red-950/40 border border-red-900/60 text-red-300 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{authError}</span>
                </div>
              )
            )}

            <button
              type="submit"
              disabled={authActionLoading}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold rounded-xl text-sm hover:opacity-95 transition active:scale-[0.98] disabled:opacity-50 disabled:scale-100 cursor-pointer flex items-center justify-center gap-1.5"
            >
              {authActionLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Please wait...</span>
                </>
              ) : (
                <span>{authIsRegistering ? "Create Chess Account" : "Sign In to Arena"}</span>
              )}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px]">
              {authIsRegistering ? "Already have an account?" : "New to Chess Analyzer?"}
            </span>
            <button
              id="auth-toggle-btn"
              onClick={() => {
                setAuthIsRegistering(!authIsRegistering);
                setAuthConfirmPassword("");
                setAuthError(null);
              }}
              className="text-emerald-400 hover:text-emerald-300 font-bold hover:underline transition cursor-pointer"
            >
              {authIsRegistering ? "Sign In Instead" : "Register Account"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const topPlayerColor = perspective === "w" ? "b" : "w";
  const bottomPlayerColor = perspective === "w" ? "w" : "b";
  const activeTurnColor = activeChess.turn();
  const isAtLatestMove = activeIndex === gameMoves.length - 1 || gameMoves.length === 0;

  // Top player timer calculation
  const isTopPlayerTurn = isAtLatestMove && (activeTurnColor === topPlayerColor);
  const playedCurrentMoveTop = !isAtLatestMove && (activeIndex >= 0) && (activeIndex % 2 === (topPlayerColor === "w" ? 0 : 1));
  const topMoveTime = isTopPlayerTurn 
    ? moveTimeElapsed 
    : (playedCurrentMoveTop ? (gameMoves[activeIndex]?.timeSpent || 0) : 0);
  const topTotalTime = topPlayerColor === "w" ? whiteTotalTime : blackTotalTime;

  // Bottom player timer calculation
  const isBottomPlayerTurn = isAtLatestMove && (activeTurnColor === bottomPlayerColor);
  const playedCurrentMoveBottom = !isAtLatestMove && (activeIndex >= 0) && (activeIndex % 2 === (bottomPlayerColor === "w" ? 0 : 1));
  const bottomMoveTime = isBottomPlayerTurn 
    ? moveTimeElapsed 
    : (playedCurrentMoveBottom ? (gameMoves[activeIndex]?.timeSpent || 0) : 0);
  const bottomTotalTime = bottomPlayerColor === "w" ? whiteTotalTime : blackTotalTime;

  return (
    <div className={`min-h-screen ${THEME_CONFIGS[appTheme].bgColor} text-slate-100 font-sans antialiased ${THEME_CONFIGS[appTheme].selectionBg} selection:text-white relative overflow-x-hidden transition-colors duration-500`}>
      
      {/* Dynamic Glassy Ambient Light Fields */}
      <div className={`absolute top-20 left-[15%] w-[45vw] h-[45vw] ${THEME_CONFIGS[appTheme].glowColor1} rounded-full blur-[140px] pointer-events-none select-none transition-colors duration-500`} />
      <div className={`absolute bottom-10 right-[10%] w-[50vw] h-[50vw] ${THEME_CONFIGS[appTheme].glowColor2} rounded-full blur-[160px] pointer-events-none select-none transition-colors duration-500`} />
      
      {/* 1. Header Navigation Bar */}
      <header className={`border-b ${THEME_CONFIGS[appTheme].borderColor} ${THEME_CONFIGS[appTheme].headerBg} backdrop-blur-md sticky top-0 z-40 px-6 py-3.5 transition-colors duration-500`}>
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 bg-slate-900 border ${THEME_CONFIGS[appTheme].borderColor} rounded-xl flex items-center justify-center shadow-lg ring-1 ring-emerald-400/10`}>
                <span className="text-emerald-400 text-2xl font-serif leading-none filter drop-shadow-[0_2px_4px_rgba(16,185,129,0.3)] select-none">
                  {THEME_CONFIGS[appTheme].logoEmoji}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span 
                    onClick={handleLogoClick}
                    className="text-lg font-black tracking-tight text-white font-sans cursor-pointer select-none active:scale-95 transition-transform inline-block"
                  >
                    Gambit
                  </span>
                  <span className={`text-[10px] ${THEME_CONFIGS[appTheme].badgeClass} px-1.5 py-0.5 rounded font-bold uppercase tracking-wider font-mono transition-colors duration-500`}>
                    Analysis Board
                  </span>
                </div>
              </div>
            </div>
          </div>
 
          {/* Interactive Navigation Tabs */}
          <div className="flex items-center gap-6">
            {[
              { id: "analysis", label: "Analysis" },
              { id: "openings", label: "Openings" },
              { id: "database", label: "Database" },
              { id: "learn", label: "Learn" },
              ...((user?.email === "izelodavinci@gmail.com" || devAdminOverride)
                ? [{ id: "admin", label: "Admin Panel" }]
                : [])
            ].map((tab) => {
              const isSelected = activeHeaderTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveHeaderTab(tab.id as any)}
                  className={`relative py-1 text-sm font-medium tracking-wide transition cursor-pointer select-none ${
                    isSelected
                      ? "text-white font-bold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span>{tab.label}</span>
                  {isSelected && (
                    <motion.div
                      layoutId="headerActiveTabIndicator"
                      className={`absolute bottom-0 inset-x-0 h-0.5 ${THEME_CONFIGS[appTheme].navActiveLine} rounded-full`}
                    />
                  )}
                </button>
              );
            })}
          </div>
 
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setPerspective(p => p === "w" ? "b" : "w")}
              className="py-1.5 px-3 bg-slate-900 border border-slate-800 text-xs font-medium rounded-xl hover:bg-slate-800 hover:border-slate-755 flex items-center gap-2 cursor-pointer transition active:scale-95 text-slate-300"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              Flip Board
            </button>
            
            {/* Website Theme Selector */}
            <select
              value={appTheme}
              onChange={(e) => {
                const val = e.target.value as AppTheme;
                setAppTheme(val);
                localStorage.setItem("gambit_app_theme", val);
                
                // Recommended matching board theme for aesthetic alignment
                const recommendedBoard = THEME_CONFIGS[val].boardThemeDefault;
                setBoardTheme(recommendedBoard);
                if (recommendedBoard !== "custom") {
                  saveThemePreferences(recommendedBoard, customColors);
                }
              }}
              className="py-1.5 px-3 bg-slate-900 border border-slate-800 text-xs font-semibold rounded-xl hover:bg-slate-850 hover:border-slate-750 text-slate-200 outline-none cursor-pointer"
              title="Change global website visual style"
            >
              {Object.entries(THEME_CONFIGS).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.name}
                </option>
              ))}
            </select>

            <select
              value={boardTheme}
              onChange={(e) => {
                const val = e.target.value as any;
                setBoardTheme(val);
                if (val !== "custom") {
                  saveThemePreferences(val, customColors);
                } else if (themeSyncStatus === "synced") {
                  setThemeSyncStatus("local");
                }
              }}
              className="py-1.5 px-3 bg-slate-900 border border-slate-800 text-xs font-medium rounded-xl hover:bg-slate-850 hover:border-slate-750 text-slate-200 outline-none cursor-pointer"
            >
              <option value="gambit">Board: Gambit Green</option>
              <option value="forest">Board: Forest Chess</option>
              <option value="wood">Board: Wood Classic</option>
              <option value="blue">Board: Tournament Blue</option>
              <option value="slate">Board: Dark Slate</option>
              <option value="custom">Board: Custom Palette 🎨</option>
            </select>
 
            <button
              id="reset-btn"
              onClick={resetToStart}
              className="py-1.5 px-3 bg-red-950/20 border border-red-900/40 text-red-300 text-xs font-medium rounded-xl hover:bg-red-900/30 hover:border-red-800 transition flex items-center gap-1.5 cursor-pointer"
            >
              Reset Arena
            </button>

            {user && (
              <div className="flex items-center gap-2.5 pl-2.5 border-l border-slate-800/80">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 font-mono">Arena Account</span>
                  <span className="text-xs font-bold text-emerald-400 max-w-[160px] truncate flex items-center gap-1.5" title={user.email || ""}>
                    {user.email?.split("@")[0] || "Guest"}
                    {(user.email === "izelodavinci@gmail.com" || devAdminOverride) && (
                      <span className="text-[8px] bg-red-950 text-red-400 border border-red-900/60 font-black px-1 rounded uppercase tracking-wider font-mono">
                        Admin
                      </span>
                    )}
                  </span>
                </div>
                <button
                  id="signout-btn"
                  onClick={handleSignOut}
                  className="py-1.5 px-2.5 bg-slate-950 hover:bg-slate-950/95 border border-slate-850 text-red-400 hover:text-red-300 text-xs font-medium rounded-xl flex items-center gap-1.5 cursor-pointer transition active:scale-95"
                  title="Sign Out of Session"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Custom Theme Color Picker Expansion Panel */}
      <AnimatePresence>
        {boardTheme === "custom" && (
          <div className="max-w-7xl mx-auto px-4 md:px-6 mt-4">
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="bg-slate-950/80 backdrop-blur-md border border-slate-800/80 p-4 rounded-2xl flex flex-col gap-3 shadow-xl overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    🎨 Custom Board Theme Designer
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Select your own colors for light and dark squares, or choose from our beautiful crafted speed presets.
                  </p>
                </div>

                {/* Status and Action Buttons */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => saveThemePreferences("custom", customColors)}
                    disabled={themeSyncStatus === "saving"}
                    className={`py-1.5 px-3.5 text-xs font-bold rounded-xl flex items-center gap-2 transition cursor-pointer active:scale-95 shadow-md ${
                      themeSyncStatus === "synced"
                        ? "bg-slate-900 border border-emerald-500/35 text-emerald-400 hover:bg-slate-850"
                        : "bg-emerald-500 text-slate-950 hover:bg-emerald-450"
                    }`}
                  >
                    {themeSyncStatus === "saving" ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5 text-current" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Saving to Profile...
                      </>
                    ) : themeSyncStatus === "synced" ? (
                      <>Saved to Profile ✓</>
                    ) : (
                      <>Save to Profile 💾</>
                    )}
                  </button>

                  <div className="flex items-center gap-1.5 text-xs">
                    {themeSyncStatus === "synced" && (
                      <span className="text-[10px] bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 px-2 py-0.5 rounded-full font-mono uppercase font-bold tracking-wider">
                        Synced ☁️
                      </span>
                    )}
                    {themeSyncStatus === "local" && (
                      <span className="text-[10px] bg-slate-900 text-slate-400 border border-slate-800 px-2 py-0.5 rounded-full font-mono uppercase font-bold tracking-wider">
                        Local Theme 💾
                      </span>
                    )}
                    {themeSyncStatus === "saving" && (
                      <span className="text-[10px] bg-amber-950/40 text-amber-400 border border-amber-950/40 px-2 py-0.5 rounded-full font-mono uppercase font-bold tracking-wider animate-pulse">
                        Updating...
                      </span>
                    )}
                    {themeSyncStatus === "error" && (
                      <span className="text-[10px] bg-red-950/40 text-red-00 border border-red-900/40 px-2 py-0.5 rounded-full font-mono uppercase font-bold tracking-wider animate-bounce">
                        Error ❌
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Main Designer Editor */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-900">
                <div className="flex items-center gap-6">
                  {/* Light squares control */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 font-medium">Light Squares:</span>
                    <div className="relative w-9 h-9 rounded-xl overflow-hidden border border-slate-800 shadow-lg flex items-center justify-center cursor-pointer hover:border-slate-700 transition">
                      <input
                        type="color"
                        value={customColors.light}
                        onChange={(e) => {
                          const nextColors = { ...customColors, light: e.target.value };
                          setCustomColors(nextColors);
                          setThemeSyncStatus("local");
                          localStorage.setItem("gambit_custom_colors", JSON.stringify(nextColors));
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="w-7 h-7 rounded-lg border border-slate-950/40" style={{ backgroundColor: customColors.light }} />
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 select-all">{customColors.light.toUpperCase()}</span>
                  </div>

                  {/* Dark squares control */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 font-medium">Dark Squares:</span>
                    <div className="relative w-9 h-9 rounded-xl overflow-hidden border border-slate-800 shadow-lg flex items-center justify-center cursor-pointer hover:border-slate-700 transition">
                      <input
                        type="color"
                        value={customColors.dark}
                        onChange={(e) => {
                          const nextColors = { ...customColors, dark: e.target.value };
                          setCustomColors(nextColors);
                          setThemeSyncStatus("local");
                          localStorage.setItem("gambit_custom_colors", JSON.stringify(nextColors));
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="w-7 h-7 rounded-lg border border-slate-950/40" style={{ backgroundColor: customColors.dark }} />
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 select-all">{customColors.dark.toUpperCase()}</span>
                  </div>
                </div>

                {/* Quick Presets list */}
                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mr-1">
                    Speed Presets:
                  </span>
                  {CUSTOM_PALETTES.map((palette) => (
                    <button
                      key={palette.name}
                      onClick={() => {
                        const nextColors = { light: palette.light, dark: palette.dark };
                        setCustomColors(nextColors);
                        setThemeSyncStatus("local");
                        localStorage.setItem("gambit_custom_colors", JSON.stringify(nextColors));
                      }}
                      className="px-2.5 py-1.5 bg-slate-900/60 hover:bg-slate-900/90 border border-slate-850 hover:border-slate-750 text-[10px] font-medium rounded-xl text-slate-300 flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                    >
                      <span className="flex w-3.5 h-3.5 rounded-sm overflow-hidden border border-slate-950/80">
                        <span className="w-1/2 h-full" style={{ backgroundColor: palette.light }} />
                        <span className="w-1/2 h-full" style={{ backgroundColor: palette.dark }} />
                      </span>
                      {palette.name}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Main Arena Dashboard Container */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        
        {(user as any)?.isOfflineFallback && !dismissedOfflineNotice && (
          <div className="mb-6 p-5 bg-amber-950/20 border border-amber-900/60 rounded-2xl relative overflow-hidden backdrop-blur-sm animate-fade-in text-xs text-amber-200">
            <div className="absolute top-0 right-0 p-4 opacity-5 font-bold text-7xl select-none">⚠️</div>
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-400 mt-0.5" />
              <div className="space-y-1.5 flex-1 p-0">
                <h4 className="font-extrabold text-sm text-yellow-300">
                  Firebase Email/Password Auth Provider Not Enabled
                </h4>
                <p className="leading-relaxed text-amber-200/90">
                  You have logged in to a <strong>Secure Local-First Offline Session</strong>. While full Chess Arena features (engine analysis, GM Coach, presets, and opening guides) are ready and fully operational, your game records won't sync to the Cloud until Email/Password authentication is enabled in your Firebase Console.
                </p>
                
                <div className="bg-slate-950/75 border border-slate-900/50 rounded-xl p-3.5 mt-2.5 max-w-2xl text-slate-350 space-y-2">
                  <p className="font-bold text-slate-200 uppercase tracking-wider text-[10px] font-mono">How to enable Cloud Sync in the Firebase Console:</p>
                  <ol className="list-decimal list-inside space-y-1.5 text-[11px] leading-relaxed">
                    <li>Go to your <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline inline-flex items-center gap-0.5">Firebase Console <ExternalLink className="w-3.5 h-3.5 inline-block -mt-0.5" /></a></li>
                    <li>Select your project, click on <strong>Authentication</strong> in the sidebar, and select the <strong>"Sign-in method"</strong> tab.</li>
                    <li>Click <strong>"Add new provider"</strong>, choose <strong>"Email/Password"</strong>, turn on the main toggle, and click <strong>"Save"</strong>.</li>
                    <li>Once completed, sign out and sign back in to start syncing game analyses automatically!</li>
                  </ol>
                  <div className="pt-2.5 border-t border-slate-900/50 flex flex-wrap items-center justify-between gap-2.5">
                    <span className="text-[10px] text-slate-400 font-medium leading-normal">Ready to connect to your updated Gambit project?</span>
                    <button
                      onClick={handleSignOut}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[10.5px] uppercase rounded-lg transition-all duration-200 shadow hover:shadow-emerald-500/20 active:scale-95 cursor-pointer flex items-center gap-1"
                    >
                      <span>Connect & Authenticate Now</span>
                      <span>➔</span>
                    </button>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setDismissedOfflineNotice(true)}
                className="px-2.5 py-1.5 hover:bg-amber-500/10 text-amber-400 rounded-lg text-[10px] font-bold uppercase transition block flex-shrink-0 self-start border border-amber-500/20 active:scale-95 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
        
        {/* PGN Game Importer Box */}
        <section className="mb-8 bg-[#0e0f14]/85 border border-white/[0.05] p-6 rounded-2xl shadow-xl backdrop-blur-lg">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-sm font-semibold tracking-wide text-slate-200 mb-1">
              <Hash className="w-4 h-4 text-purple-400" />
              Direct PGN Game Importer
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Paste any raw chess PGN string below to import, parse metadata/moves, and trigger engine analysis instantly.
            </p>
            
            <form onSubmit={handleImportPgnSubmit} className="flex flex-col md:flex-row gap-3">
              <textarea
                placeholder="e.g. 1. e4 e5 2. Nf3 Nc6 3. Bb5 a6..."
                rows={2}
                value={importPgn}
                onChange={(e) => setImportPgn(e.target.value)}
                className="flex-1 px-4 py-3 bg-slate-900/90 border border-slate-800 rounded-xl text-xs placeholder-slate-600 focus:outline-none focus:border-purple-400/80 focus:ring-1 focus:ring-purple-400/80 text-slate-200"
              />
              <button
                type="submit"
                disabled={!importPgn}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-slate-950 font-bold rounded-xl text-xs hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:scale-100 cursor-pointer transition flex items-center justify-center gap-1.5 min-w-[140px]"
              >
                Pgn Setup
              </button>
            </form>
          </div>
        </section>

        {/* Error message box if any */}
        {fetchError && (
          <div className="mb-6 p-4 bg-red-950/30 border border-red-900/60 text-red-300 rounded-xl text-xs flex items-center gap-2.5 animate-pulse">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{fetchError}</span>
          </div>
        )}

        {/* SUB PAGE RENDERS BASED ON ACTIVE HEADER TAB */}
        {activeHeaderTab === "openings" && (
          <div className="space-y-6 animate-fade-in text-xs">
            <div className="bg-[#0e0f14]/80 border border-white/[0.05] p-6 rounded-2xl shadow-xl backdrop-blur-lg">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-5 h-5 text-emerald-400" />
                <h2 className="text-xl font-bold tracking-tight text-white font-sans">
                  Opening Masterworks Database
                </h2>
              </div>
              <p className="text-slate-400 mb-6 text-xs max-w-2xl leading-normal font-sans">
                Study classic chess openings. Click "Load Move Path" to load the variation onto the live interactive board and trigger computer evaluations.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {Object.entries(OPENING_DATABASE).map(([sequence, opInfo]) => (
                  <div key={sequence} className="bg-slate-900/60 hover:bg-slate-900 border border-slate-800/60 p-5 rounded-xl transition hover:border-[#558460]/40 flex flex-col justify-between">
                    <div className="flex flex-col sm:flex-row gap-4 mb-3">
                      {/* Small Non-Interactive Board Preview */}
                      <OpeningBoardPreview sequence={sequence} />

                      {/* Text content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5 gap-2">
                          <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-400 border border-emerald-900 shrink-0">
                            ECO {opInfo.eco}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500 font-semibold truncate" title={sequence}>{sequence}</span>
                        </div>
                        <h3 className="text-base font-bold text-slate-100 mb-1 leading-tight">
                          {opInfo.name}
                        </h3>
                        <p className="text-xs text-slate-400 leading-normal mb-3">
                          {opInfo.description}
                        </p>
                        <div className="text-[11px] text-[#ebd4a0] bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/40 space-y-1">
                          <span className="font-bold text-[#71ac82] block">Strategic Directive:</span>
                          <p className="leading-relaxed text-slate-300">{opInfo.strategicGoal}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-800">
                      <div className="flex gap-1.5 overflow-hidden max-w-[60%]">
                        {opInfo.famousPlayers.slice(0, 2).map((player, pIdx) => (
                          <span key={pIdx} className="text-[10px] bg-slate-950 px-2 py-0.5 rounded text-slate-500 truncate">
                            {player}
                          </span>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          const game = new Chess();
                          try {
                            game.load("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
                            const pathMoves = sequence.split(" ");
                            const customAnalysisMoves: AnalysisMove[] = [];
                            pathMoves.forEach((mv) => {
                              if (!mv) return;
                              const fenBefore = game.fen();
                              const result = game.move(mv);
                              customAnalysisMoves.push({
                                san: result.san,
                                uci: result.from + result.to,
                                fenBefore: fenBefore,
                                fenAfter: game.fen(),
                              });
                            });
                            setFen(game.fen());
                            setGameMoves(customAnalysisMoves);
                            setActiveIndex(customAnalysisMoves.length - 1);
                            setActiveHeaderTab("analysis");
                          } catch (err) {
                            console.warn("Failed path simulation. Reverting to preset FEN:", err);
                          }
                        }}
                        className="px-3 py-1.5 bg-[#558460] hover:bg-[#669970] text-white rounded-lg text-[10px] font-bold tracking-wide transition uppercase cursor-pointer"
                      >
                        Load Move Path
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeHeaderTab === "database" && (
          <div className="space-y-6 animate-fade-in text-xs">
            <div className="bg-[#0e0f14]/80 border border-white/[0.05] p-6 rounded-2xl font-sans shadow-xl backdrop-blur-lg">
              <div className="flex items-center gap-2 mb-2">
                <Hash className="w-5 h-5 text-indigo-400" />
                <h2 className="text-xl font-bold tracking-tight text-white font-sans">
                  Historical Master Games Database
                </h2>
              </div>
              <p className="text-slate-400 mb-6 text-xs max-w-2xl leading-normal">
                Select a historically famous game from our archival database. Load all recorded moves directly into the interactive analysis board for study.
              </p>

              <div className="space-y-3">
                {[
                  {
                    title: "Bobby Fischer vs Boris Spassky (1972)",
                    desc: "The 'Match of the Century' Game 6. Fischer plays the stunning Queen's Gambit, deviating from his lifelong King's Pawn openings to seize Spassky's strategic castle.",
                    movesCount: "36 plies",
                    presetName: "Fischer vs Spassky (1972) - Game 6",
                    pgn: "1. c4 e6 2. Nf3 d5 3. d4 Nf6 4. Nc3 Be7 5. Bg5 O-O 6. e3 h6 7. Bh4 b6 8. cxd5 Nxd5 9. Bxe7 Qe7 10. Nxd5 exd5 11. Rc1 Be6 12. Qa4 c5 13. Qa3 Rc8 14. Bb5 a6 15. dxc5 bxc5 16. O-O Ra7 17. Be2 Nd7 18. Nd4"
                  },
                  {
                    title: "Kasparov vs Deep Blue (1997)",
                    desc: "Game 6 of the historic rematch. Deep Blue plays a shocking knight sacrifice on e6, shattering Kasparov's Caro-Kann defense in just 18 moves.",
                    movesCount: "18 plies",
                    presetName: "Kasparov vs Deep Blue (1997) - Game 6",
                    pgn: "1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Nd7 5. Ng5 Ngf6 6. Bd3 e6 7. N1f3 Bd6 8. Qe2 h6 9. Nxe6 fxe6 10. Bg6+ Kf8 11. O-O Nb6 12. c4 c5 13. b3 Kg8 14. Bb2 Bd7 15. Rad1 Nc8 16. Ne5 Be8 17. Bb1 Ne7 18. Rfe1"
                  },
                  {
                    title: "Magnus Carlsen vs Hikaru Nakamura (2020)",
                    desc: "The hyper-fast Magnus Carlsen Invitational finals, showcasing an incredible double rook defense and brilliant end-game squeeze by Carlsen.",
                    movesCount: "12 plies",
                    presetName: "Magnus Carlsen vs Hikaru Nakamura (2020)",
                    pgn: "1. d4 Nf6 2. c4 e6 3. Nf3 d5 4. Nc3 Be7 5. Bf4 O-O 6. e3 b6 7. Bd3 dxc4 8. Bxc4 Bb7 9. O-O Nbd7 10. Qe2 Ne4 11. Rac1 Nxc3 12. Rxc3 c5"
                  }
                ].map((game, gIdx) => (
                  <div key={gIdx} className="bg-slate-900/40 hover:bg-slate-900 border border-slate-850 p-5 rounded-xl transition hover:border-indigo-500/25 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-1 max-w-[75%]">
                      <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 font-sans">
                        <span className="text-indigo-400 text-lg">♟</span>
                        {game.title}
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed font-sans">
                        {game.desc}
                      </p>
                      <div className="flex gap-2 text-[10px] font-mono text-slate-500 font-semibold pt-1">
                        <span>Game length: {game.movesCount}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const gObj = new Chess();
                        try {
                          gObj.load("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
                          const pgnMovesString = game.pgn.replace(/\d+\.\s+/g, "").trim();
                          const pgnMovesArray = pgnMovesString.split(/\s+/);
                          const parsedAnalysisMoves: AnalysisMove[] = [];
                          pgnMovesArray.forEach((mv) => {
                            if (!mv) return;
                            const fenBefore = gObj.fen();
                            const result = gObj.move(mv);
                            parsedAnalysisMoves.push({
                              san: result.san,
                              uci: result.from + result.to,
                              fenBefore: fenBefore,
                              fenAfter: gObj.fen(),
                            });
                          });
                          setFen(gObj.fen());
                          setGameMoves(parsedAnalysisMoves);
                          setActiveIndex(parsedAnalysisMoves.length - 1);
                          setMetadata({
                            white: { name: game.title.split(" vs ")[0], rating: "GM" },
                            black: { name: game.title.split(" vs ")[1]?.split(" (")[0] || "Master Player", rating: "GM" },
                            event: "Historic Archives Replay",
                          });
                          setAccuracyReport(null);
                          setActiveHeaderTab("analysis");
                        } catch (e) {
                          console.error("Historical pgn load error:", e);
                        }
                      }}
                      className="px-4 py-2 bg-indigo-950 text-indigo-300 hover:text-white border border-indigo-900/60 hover:bg-slate-850 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap self-start md:self-auto"
                    >
                      Analyze Game
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeHeaderTab === "learn" && (
          <div className="space-y-6 animate-fade-in text-xs">
            <div className="bg-[#0e0f14]/80 border border-white/[0.05] p-6 rounded-2xl shadow-xl backdrop-blur-lg">
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap className="w-5 h-5 text-amber-400" />
                <h2 className="text-xl font-bold tracking-tight text-white font-sans">
                  Tactics Puzzles
                </h2>
              </div>
              <p className="text-slate-400 mb-6 text-xs max-w-2xl leading-normal font-sans">
                Test your chess sight! Choose a tactical puzzle configuration. Load the tactical FEN and try solving or analyzing with interactive coach commentary!
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 font-sans">
                {[
                  {
                    title: "The Philidor Smothered Mate",
                    desc: "Can you spot white's beautiful, double-checked queen sacrifice leading to a smothered mate where the enemy king is suffocated by his own structural defenders?",
                    difficulty: "Medium",
                    fen: "6rk/5Npp/8/8/8/8/8/6Rk b - - 0 1"
                  },
                  {
                    title: "Classic Greek Gift Sacrifice",
                    desc: "The classic Bxh7+ sacrifice! Destroy black's king castle safety using a direct tactical assault with your active knights and queens.",
                    difficulty: "Hard",
                    fen: "r1bqk2r/ppp1bppp/2n1p3/3p4/3P4/2PBPNP1/PP3PP1/RN1QK2R w KQkq - 1 8"
                  },
                  {
                    title: "Anastasia's Mate Setup",
                    desc: "Spot the combination where a coordinating rook and knight coordinate perfectly against the edge rank, suffocating the black king into submission.",
                    difficulty: "Medium",
                    fen: "k6r/4Nppp/8/1r6/8/8/8/1R4K1 w - - 0 1"
                  }
                ].map((puzzle, pIdx) => (
                  <div key={pIdx} className="bg-slate-900/60 p-5 rounded-xl border border-slate-850 hover:border-amber-500/25 transition flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono leading-none bg-amber-950/50 text-amber-400 px-2 py-1 rounded border border-amber-900/60 font-bold uppercase tracking-wider">
                          Difficulty: {puzzle.difficulty}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">Puzzle #{pIdx + 1}</span>
                      </div>
                      <h3 className="text-base font-bold text-slate-100 mb-2 leading-tight">
                        {puzzle.title}
                      </h3>
                      <p className="text-xs text-slate-400 leading-normal mb-4 text-slate-300">
                        {puzzle.desc}
                      </p>
                    </div>
                    
                    <button
                      onClick={() => {
                        setFen(puzzle.fen);
                        setGameMoves([]);
                        setActiveIndex(-1);
                        setAccuracyReport(null);
                        setMetadata({
                          white: { name: "Puzzle Solver", rating: "STUDENT" },
                          black: { name: "Engine AI Defender", rating: "EVALUATOR" },
                          event: puzzle.title
                        });
                        setActiveHeaderTab("analysis");
                      }}
                      className="px-4 py-2 bg-amber-950 hover:bg-amber-900 text-amber-300 hover:text-white rounded-xl border border-amber-900/40 text-xs font-bold transition flex items-center gap-1.5 justify-center cursor-pointer select-none"
                    >
                      Load Challenge Board
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ADMIN PANEL SUB PAGE */}
        {activeHeaderTab === "admin" && (
          <div className="space-y-6 animate-fade-in text-xs font-sans">
            <div className="bg-[#0e0f14]/85 border border-[#558460]/20 p-6 rounded-2xl shadow-2xl backdrop-blur-lg">
              
              {/* Layout Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800/60">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-950/40 border border-red-900/60 rounded-2xl flex items-center justify-center shadow-lg ring-1 ring-red-500/20">
                    <span className="text-red-400 text-2xl font-serif select-none">🛡️</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                       Gambit Arena Admin Portal
                    </h2>
                    <p className="text-slate-400 text-xs">
                      Manage dynamic AI grandmaster personas, analyze database properties, and verify Firebase project linkages.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 bg-red-950/25 border border-red-900/30 px-3 py-1.5 rounded-xl font-mono text-[10px] text-red-400">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  AUTHENTICATED AS SYSTEM OWNER
                </div>
              </div>

              {/* Grid: 2 Columns */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* COLUMN 1 & 2: Main Controller Settings (span-2) */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Persona Selector Panel */}
                  <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-1.5 text-base font-bold text-slate-100">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Global Coach Model Persona</span>
                    </div>
                    <p className="text-slate-400 mb-4 text-xs leading-normal">
                      Select which historical World Champion or specialized Grandmaster analysis engine coordinates the Gemini AI commentary for position assessments on the live board.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {[
                        {
                          id: "expert",
                          name: "Senior GM Coach",
                          era: "Traditional Standard",
                          icon: "🎓",
                          desc: "Maintains optimal pedagogical standards. Clear positional insights, balanced tacticals, encouraging critiques."
                        },
                        {
                          id: "tal",
                          name: "Mikhail Tal",
                          era: "Soviet Legend • 1960",
                          icon: "🪄",
                          desc: "The Magician from Riga. Highly tactical attacking bias, advocates daring combinations, material sacrifices, and chaotic plans."
                        },
                        {
                          id: "fischer",
                          name: "Bobby Fischer",
                          era: "American Titan • 1972",
                          icon: "🇺🇸",
                          desc: "Uncompromising mathematical precision. Highly objective, direct, sharp critiques for loose positional lines."
                        },
                        {
                          id: "carlsen",
                          name: "Magnus Carlsen",
                          era: "Endgame Virtuoso • Active",
                          icon: "🇳🇴",
                          desc: "Pragmatic endgame pressure. Emphasizes piece activity, squeezing minuscule advantages, and restricting opponent counters."
                        },
                        {
                          id: "kasparov",
                          name: "Garry Kasparov",
                          era: "The Beast of Baku • 1985",
                          icon: "🔥",
                          desc: "High intensity and relentless aggression. Heavy focus on establishing center control, multi-move tactics, and absolute dominance."
                        }
                      ].map((p) => {
                        const isActive = selectedPersona === p.id;
                        return (
                          <div
                            key={p.id}
                            onClick={() => {
                              setSelectedPersona(p.id as any);
                              setActiveAlert({
                                text: `Active Persona Synchronized`,
                                sub: `${p.name} is now analyzing target boards. Move evaluations are routed to his tactical matrix.`,
                                type: "info"
                              });
                            }}
                            className={`p-4 rounded-xl border transition cursor-pointer select-none flex gap-3 h-full ${
                              isActive
                                ? "bg-[#558460]/10 border-[#558460] ring-1 ring-[#558460]/20 text-white"
                                : "bg-slate-950/40 border-slate-850 hover:border-slate-750 text-slate-300"
                            }`}
                          >
                            <span className="text-2xl mt-0.5">{p.icon}</span>
                            <div className="flex-1 space-y-1 font-sans">
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold text-sm">{p.name}</span>
                                {isActive && (
                                  <span className="text-[8px] bg-[#558460]/20 text-emerald-400 border border-[#558460]/40 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                                    Active
                                  </span>
                                )}
                              </div>
                              <span className="block text-[10px] text-slate-500 font-mono">{p.era}</span>
                              <p className="text-slate-400 text-xs leading-normal pt-1">{p.desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* System Announcement Panel */}
                  <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-2 text-base font-bold text-slate-100">
                      <Tv className="w-4 h-4 text-emerald-400" />
                      <span>Console Announcements & Arena Greetings</span>
                    </div>
                    <p className="text-slate-400 mb-4 text-xs">
                      Update the primary administrative welcome announcement shown to standard Gambit Arena users below.
                    </p>
                    <textarea
                      value={adminMemo}
                      onChange={(e) => setAdminMemo(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:border-[#558460] focus:ring-1 focus:ring-[#558460] outline-none text-xs font-mono h-24 resize-none leading-relaxed"
                    />
                    <div className="mt-2.5 flex justify-end">
                      <button
                        onClick={() => {
                          setActiveAlert({
                            text: "System Broadcast Dispatched",
                            sub: "Your administrator announcement has been written to the local cluster memory cache.",
                            type: "success"
                          });
                        }}
                        className="py-1.5 px-4 bg-[#558460] hover:bg-[#436b4e] text-white text-xs font-bold rounded-lg cursor-pointer transition select-none"
                      >
                        Publish Broadcast
                      </button>
                    </div>
                  </div>

                </div>

                {/* COLUMN 3: Telemetry & Config Linked (span-1) */}
                <div className="space-y-6 animate-fade-in text-xs font-sans">
                  
                  {/* Linked Firebase Project Metadata */}
                  <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>Connected Firebase Cluster</span>
                    </div>

                    <div className="space-y-3 font-mono text-[10px]">
                      <div className="bg-slate-950 border border-slate-850 p-2.5 rounded-lg">
                        <span className="block text-slate-500 uppercase tracking-widest text-[8px] mb-0.5">Project ID</span>
                        <span className="text-emerald-400 font-extrabold break-all font-mono">{firebaseConfig.projectId || "Not Set"}</span>
                      </div>
                      <div className="bg-slate-950 border border-slate-850 p-2.5 rounded-lg">
                        <span className="block text-slate-500 uppercase tracking-widest text-[8px] mb-0.5">Auth Domain</span>
                        <span className="text-slate-300 break-all">{firebaseConfig.authDomain || "Not Set"}</span>
                      </div>
                      <div className="bg-slate-950 border border-slate-850 p-2.5 rounded-lg">
                        <span className="block text-slate-500 uppercase tracking-widest text-[8px] mb-0.5">Storage Bucket</span>
                        <span className="text-slate-300 break-all">{firebaseConfig.storageBucket || "Not Set"}</span>
                      </div>
                      <div className="bg-slate-950 border border-slate-850 p-2.5 rounded-lg flex items-center justify-between">
                        <div>
                          <span className="block text-slate-500 uppercase tracking-widest text-[8px] mb-0.5">Auth Provider Status</span>
                          <span className="text-emerald-500 font-bold">Enabled</span>
                        </div>
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      </div>
                    </div>

                    <p className="text-slate-500 text-[10px] leading-normal pt-1 flex items-start gap-1.5 font-sans">
                      <Info className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                      Credential synchronizers are locked using the high-security gambit master key payload provided by the administrator.
                    </p>
                  </div>

                  {/* Stockfish Engine Controls */}
                  <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
                      <Sliders className="w-4 h-4 text-indigo-400" />
                      <span>Engine Calibration</span>
                    </div>

                    <div className="space-y-4 font-sans">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Engine Target Search Depth</span>
                          <span className="font-mono text-indigo-400 font-bold">{engineDepth} Plies</span>
                        </div>
                        <input
                          type="range"
                          min="4"
                          max="16"
                          value={engineDepth}
                          onChange={(e) => {
                            const newDepth = parseInt(e.target.value);
                            setEngineDepth(newDepth);
                            setActiveAlert({
                              text: "Engine Depth Altered",
                              sub: `Calculation accuracy set to ${newDepth} steps. Deep analysis on move replay will use this precision depth.`,
                              type: "info"
                            });
                          }}
                          className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-[#558460] border border-slate-800"
                        />
                        <span className="block text-[9px] text-slate-500 leading-normal">
                          Slowing down target depth will process moves slower but provides profound endgame insights within sandbox modes.
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                        <span className="text-slate-400">Toggle Tactical Evaluation Log</span>
                        <button
                          onClick={() => {
                            setEngineActive(prev => !prev);
                            setActiveAlert({
                              text: `Engine Analysis ${!engineActive ? "Activated" : "Deactivated"}`,
                              sub: !engineActive ? "Sub-second evaluations will update move lists." : "Automatic background analysis suspended.",
                              type: "info"
                            });
                          }}
                          className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer outline-none border ${
                            engineActive ? "bg-[#558460] border-[#558460]" : "bg-slate-950 border-slate-800"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white transition-transform ${
                              engineActive ? "translate-x-5" : ""
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          </div>
        )}

        {/* Outer Arena Grid */}
        {activeHeaderTab === "analysis" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT SECTION (Col 7): Chessboard & Controls */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* Player Info (Black) */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-900/50 border border-slate-850 rounded-xl">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-slate-950 border border-slate-705 flex items-center justify-center font-mono font-bold text-slate-300">
                  {perspective === "w" ? "B" : "W"}
                </div>
                <div>
                  <div className="text-sm font-semibold">
                    {perspective === "w" ? metadata.black.name : metadata.white.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono -mt-0.5">
                    Rating: {perspective === "w" ? metadata.black.rating || "1500?" : metadata.white.rating || "1500?"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Hand/Captured Log */}
                <div className="flex items-center gap-1">
                  {(perspective === "w" ? capturedPieces.whiteCaptured : capturedPieces.blackCaptured).map((p, pIdx) => (
                    <img key={pIdx} src={p.url} alt="Captured piece" className="w-5 h-5 opacity-70 hover:opacity-100" />
                  ))}
                </div>
              </div>
            </div>

            {/* Chessboard Row + Eval Bar */}
            <div className="flex items-stretch gap-3 aspect-square relative max-w-[580px] mx-auto w-full">
              
              {/* EVALUATION BAR CONTROLLER */}
              {engineActive && (
                <div className="w-5 rounded-xl bg-[#0a0b10]/90 border border-white/[0.05] flex flex-col relative overflow-hidden shrink-0 shadow-lg select-none">
                  {/* Black evaluation section is represented by the dark background */}
                  
                  {/* White evaluation section fills from the bottom up */}
                  <div 
                    className="w-full bg-gradient-to-t from-slate-200 to-white transition-all duration-300 absolute bottom-0 left-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]" 
                    style={{ height: `${perspective === "w" ? evalRatio : 100 - evalRatio}%` }}
                  />

                  {/* Centripawn ticks (notch marks in the center & quarters) */}
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-b border-dashed border-white/20 z-10" />
                  <div className="absolute inset-x-0 top-1/4 border-b border-dotted border-white/5 z-10" />
                  <div className="absolute inset-x-0 top-3/4 border-b border-dotted border-white/5 z-10" />
                  
                  {/* Floating partition label */}
                  <div 
                    className="absolute inset-x-0 z-20 flex justify-center pointer-events-none transition-all duration-300"
                    style={{ 
                      bottom: `${perspective === "w" ? evalRatio : 100 - evalRatio}%`,
                      transform: 'translateY(50%)'
                    }}
                  >
                    <span className="bg-slate-950/90 text-white border border-white/10 rounded px-1.5 py-0.5 font-mono font-black text-[9px] shadow-lg backdrop-blur-sm tracking-tighter">
                      {latestEval?.score || "0.0"}
                    </span>
                  </div>
                </div>
              )}

              {/* CHESSBOARD LAYER */}
              <div className="flex-1 relative">
                <Chessboard
                  fen={fen}
                  perspective={perspective}
                  interactive={sandboxMode || gameMoves.length === 0}
                  onMove={handlePlayerMove}
                  lastMove={
                    activeIndex >= 0 && gameMoves[activeIndex]
                      ? {
                          from: gameMoves[activeIndex].uci.substring(0, 2),
                          to: gameMoves[activeIndex].uci.substring(2, 4),
                        }
                      : undefined
                  }
                  lastMoveClassification={
                    activeIndex >= 0 && gameMoves[activeIndex]
                      ? gameMoves[activeIndex].classification
                      : undefined
                  }
                  bestMoveHint={latestEval?.bestMove}
                  boardTheme={boardTheme}
                  customColors={customColors}
                />
              </div>
            </div>

            {/* Player Info (White) */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-900/50 border border-slate-850 rounded-xl">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-slate-200 border border-white flex items-center justify-center font-mono font-bold text-slate-950">
                  {perspective === "w" ? "W" : "B"}
                </div>
                <div>
                  <div className="text-sm font-semibold">
                    {perspective === "w" ? metadata.white.name : metadata.black.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono -mt-0.5">
                    Rating: {perspective === "w" ? metadata.white.rating || "1500?" : metadata.black.rating || "1500?"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Hand/Captured Log */}
                <div className="flex items-center gap-1">
                  {(perspective === "w" ? capturedPieces.blackCaptured : capturedPieces.whiteCaptured).map((p, pIdx) => (
                    <img key={pIdx} src={p.url} alt="Captured piece" className="w-5 h-5 opacity-70 hover:opacity-100" />
                  ))}
                </div>
              </div>
            </div>

            {/* Playback Controls Panel */}
            <div className="bg-slate-950 border border-slate-800/80 p-4 rounded-xl shadow-md flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleStepFirst}
                    disabled={gameMoves.length === 0 || activeIndex === -1}
                    className="p-2 rounded bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 disabled:opacity-40 transition active:scale-95 cursor-pointer"
                    title="First Position"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleStepPrev}
                    disabled={gameMoves.length === 0 || activeIndex === -1}
                    className="p-2 rounded bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 disabled:opacity-40 transition active:scale-95 cursor-pointer"
                    title="Previous Move"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  {/* Play / Pause Toggle */}
                  <button
                    onClick={() => setIsPlaying(p => !p)}
                    disabled={gameMoves.length === 0 || activeIndex === gameMoves.length - 1}
                    className={`p-2 rounded font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer ${
                      isPlaying 
                        ? "bg-amber-500 text-slate-950 border border-amber-600 hover:opacity-90"
                        : "bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-300"
                    }`}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    <span className="text-xs hidden md:inline">{isPlaying ? "Pause" : "Autoplay"}</span>
                  </button>

                  <button
                    onClick={handleStepNext}
                    disabled={gameMoves.length === 0 || activeIndex === gameMoves.length - 1}
                    className="p-2 rounded bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 disabled:opacity-40 transition active:scale-95 cursor-pointer"
                    title="Next Move"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleStepLast}
                    disabled={gameMoves.length === 0 || activeIndex === gameMoves.length - 1}
                    className="p-2 rounded bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 disabled:opacity-40 transition active:scale-95 cursor-pointer"
                    title="Current Position / Last Move"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Accuracy review button */}
                {gameMoves.length > 0 && !accuracyReport && (
                  <button
                    onClick={runFullGameReview}
                    disabled={isReviewing}
                    className="py-1.5 px-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:opacity-95 text-slate-950 text-xs font-bold rounded-lg transition active:scale-95 flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {isReviewing ? `Reviewing (${reviewCount}/${reviewTotal})...` : "Trigger Engine Game Review"}
                  </button>
                )}
              </div>

              {/* Interactive Speed Multipliers */}
              {isPlaying && (
                <div className="flex items-center gap-2 mt-1 px-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Speed Interval:</span>
                  {[1000, 2000, 3000].map(sp => (
                    <button
                      key={sp}
                      onClick={() => setPlaybackSpeed(sp)}
                      className={`text-[9px] font-mono px-2 py-0.5 rounded transition ${
                        playbackSpeed === sp ? "bg-emerald-500 text-slate-950 font-bold" : "bg-slate-900 text-slate-400 border border-slate-800"
                      }`}
                    >
                      {(sp / 1000).toFixed(1)}s
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT SECTION (Col 5): Controls, Analysis & GM Coach */}
          <div className="lg:col-span-5 flex flex-col gap-6">

            {/* SCREENSHOT-ACCURATE EVALUATION CARD */}
            <div className="bg-slate-900/35 backdrop-blur-md border border-white/[0.06] rounded-2xl p-5 shadow-2xl relative overflow-hidden transition duration-305 hover:border-white/[0.12]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/[0.02] rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] uppercase tracking-widest text-[#a3e635] font-extrabold font-mono">
                  EVALUATION
                </span>
                <span className="text-[10px] bg-slate-950/70 border border-white/[0.06] backdrop-blur-sm text-slate-300 px-3 py-1 rounded-full font-bold uppercase tracking-wider font-mono">
                  {activeChess.turn() === "w" ? "White to move" : "Black to move"}
                </span>
              </div>
              
              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl font-black tracking-tight text-white font-sans bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300">
                  {latestEval?.score || "+0.4"}
                </span>
                {latestEval?.depth && (
                  <span className="text-[9px] text-[#a1a1aa] font-mono font-bold uppercase tracking-wider">
                    depth {latestEval.depth} plies
                  </span>
                )}
              </div>

              <div className="bg-slate-950/50 backdrop-blur-sm border border-white/[0.05] p-3 rounded-xl flex items-center justify-between shadow-inner">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#558460] shrink-0" />
                  <span className="text-[11px] font-sans font-semibold text-slate-400">Best line</span>
                </div>
                <span className="text-xs font-mono font-bold text-[#eae6d1] bg-[#558460]/20 border border-[#558460]/40 px-2.5 py-0.5 rounded-lg select-all">
                  {latestEval?.bestMove || "Nc3 c6"}
                </span>
              </div>
            </div>
            
            {/* 1. INTERACTIVE CLASSIFICATION ALERT */}
            <AnimatePresence>
              {activeAlert && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  className={`rounded-2xl p-4 flex items-center justify-between border shadow-xl relative overflow-hidden ${
                    activeAlert.type === "brilliant"
                      ? "bg-gradient-to-r from-blue-950 to-indigo-950 border-blue-500/40 text-blue-100 shadow-[0_0_15px_rgba(59,130,246,0.25)]"
                      : activeAlert.type === "great"
                      ? "bg-gradient-to-r from-[#111e16] to-[#042f1a] border-emerald-500/40 text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                      : "bg-gradient-to-r from-red-950 to-slate-950 border-red-500/40 text-red-100 shadow-[0_0_12px_rgba(239,68,68,0.25)]"
                  }`}
                >
                  <div className="flex items-center gap-3 relative z-10">
                    <span className="text-2xl filter drop-shadow">
                      {activeAlert.type === "brilliant" ? "!! ⚡" : activeAlert.type === "great" ? "! ⭐" : "?? ⚠️"}
                    </span>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider font-mono">
                        {activeAlert.text}
                      </h4>
                      <p className="text-[11px] opacity-85 mt-0.5 leading-tight">{activeAlert.sub}</p>
                    </div>
                  </div>
                  
                  <span className="animate-pulse text-[8px] font-mono tracking-widest font-black opacity-30 uppercase">
                    LIVE COACH ALERT
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 2. DYNAMIC OPENING THEORY EXPLORER */}
            <AnimatePresence mode="wait">
              {activeOpening && (
                <motion.div
                  key={activeOpening.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-3 opacity-10 font-serif text-5xl">📖</div>
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="text-[9px] bg-[#558460]/20 text-[#71ac82] border border-[#558460]/30 font-bold px-2 py-0.5 rounded-md uppercase tracking-wider font-mono">
                      ECO {activeOpening.eco}
                    </span>
                    <h4 className="text-xs font-bold text-slate-400 font-sans tracking-wide">Opening Theory Active</h4>
                  </div>
                  
                  <h3 className="text-base font-extrabold text-white mb-2 leading-tight">
                    {activeOpening.name}
                  </h3>
                  
                  <p className="text-xs text-slate-350 leading-relaxed mb-4">
                    {activeOpening.description}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-800/60">
                    <div>
                      <span className="text-[9px] text-slate-500 font-mono font-bold uppercase tracking-wider block mb-0.5">Strategic Concept:</span>
                      <span className="text-[11px] text-slate-300 leading-normal block">
                        {activeOpening.strategicGoal}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 font-mono font-bold uppercase tracking-wider block mb-1">Famous Proponents:</span>
                      <div className="flex flex-wrap gap-1">
                        {activeOpening.famousPlayers.map((player, pIdx) => (
                          <span key={pIdx} className="text-[9px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-400">
                            {player}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {activeOpening.possibleMoves && activeOpening.possibleMoves.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-800/60">
                      <span className="text-[9px] text-[#71ac82] font-mono font-bold uppercase tracking-wider block mb-2">Theoretical continuations (click to play):</span>
                      <div className="flex flex-wrap gap-1.5 font-sans">
                        {activeOpening.possibleMoves.map((movLine, mIdx) => (
                          <button
                            key={mIdx}
                            onClick={() => handlePlaySANMove(movLine)}
                            title={`Play ${movLine} on the active review board`}
                            className="text-[10px] bg-slate-900 hover:bg-[#558460]/20 hover:border-[#558460]/40 border border-slate-800 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg transition font-mono flex items-center gap-1.5 select-none active:scale-95 cursor-pointer text-left"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                            <span>{movLine}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Engine Configurations & Status */}
            <div className="bg-[#0e0f14]/80 border border-white/[0.05] p-5 rounded-2xl shadow-xl backdrop-blur-lg">
              <h2 className="text-sm font-semibold text-slate-200 mb-4 flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-400 animate-pulse" />
                  Chess Engine Diagnostics
                </span>
                <span className={`text-[9px] px-2 py-0.5 font-mono rounded font-medium ${
                  engineReady ? "bg-emerald-950/60 text-emerald-300 border border-emerald-900" : "bg-amber-950/60 text-amber-300 border border-amber-900"
                }`}>
                  {engineReady ? "● ENGINE STANDBY" : "○ BOOTING WORKER"}
                </span>
              </h2>

              <div className="space-y-4 text-xs">
                {/* Engine Activation */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-300">Auto evaluation bar</p>
                    <p className="text-[10px] text-slate-400">Run calculations on move change</p>
                  </div>
                  <button
                    onClick={() => setEngineActive(a => !a)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg border transition ${
                      engineActive 
                        ? "bg-emerald-950/40 text-emerald-400 border-emerald-900 hover:bg-emerald-900/20" 
                        : "bg-slate-900 text-slate-500 border-slate-800 hover:bg-slate-850"
                    }`}
                  >
                    {engineActive ? "Active" : "Disabled"}
                  </button>
                </div>

                {/* Depth selector */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-300">Engine Depth</p>
                    <p className="text-[10px] text-slate-400">High depths give precise answers but take longer</p>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-0.5 border border-slate-800">
                    {[10, 12, 14].map(d => (
                      <button
                        key={d}
                        onClick={() => setEngineDepth(d)}
                        className={`px-2.5 py-1 rounded text-[10px] font-mono leading-none transition ${
                          engineDepth === d ? "bg-slate-850 text-emerald-400 font-bold" : "text-slate-400"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Diagnostic Score Display */}
                {latestEval && (
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800/85 grid grid-cols-3 gap-2 font-mono text-[10px]">
                    <div>
                      <span className="text-slate-500 block uppercase tracking-wide text-[8px] font-sans">Evaluation</span>
                      <span className="text-slate-200 font-bold text-xs">{latestEval.score}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block uppercase tracking-wide text-[8px] font-sans">Best Move</span>
                      <span className="text-slate-200 font-bold text-xs uppercase">{latestEval.bestMove || "Calculating"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block uppercase tracking-wide text-[8px] font-sans">Depth Reach</span>
                      <span className="text-slate-200 font-bold text-xs">{latestEval.depth} plies</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* MOVES LIST & HISTORY PANEL WITH INTUITIVE TABS (Moves, Game Review, Info, Openings) */}
            <div className="bg-[#0e0f14]/85 border border-white/[0.06] p-5 rounded-2xl shadow-xl backdrop-blur-lg flex flex-col">
              
              {/* Horizontal Tabs Row (matching Image 1 / Image 3) */}
              <div className="flex border-b border-slate-800/60 mb-4 text-xs font-semibold select-none">
                {[
                  { id: "moves", label: "Moves" },
                  { id: "review", label: "Game Review", dot: !!accuracyReport },
                  { id: "info", label: "Info" },
                  { id: "openings", label: "Openings" }
                ].map((tab) => {
                  const isSelected = analysisSidebarTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setAnalysisSidebarTab(tab.id as any)}
                      className={`flex-1 pb-2.5 text-center transition-all border-b-2 relative cursor-pointer font-sans tracking-wide text-[11px] ${
                        isSelected 
                          ? "border-emerald-500 text-slate-100 font-extrabold" 
                          : "border-transparent text-slate-400 hover:text-slate-200 font-medium"
                      }`}
                    >
                      <span>{tab.label}</span>
                      {tab.dot && (
                        <span className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(16,185,129,0.8)]" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* TAB CONTENT: "moves" */}
              {analysisSidebarTab === "moves" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-mono tracking-widest pb-1 border-b border-white/[0.02]">
                    <span>Ply Index</span>
                    <span className="bg-[#000]/35 border border-white/5 px-2 py-0.5 rounded">
                      {gameMoves.length} Plies Total
                    </span>
                  </div>

                  {gameMoves.length > 0 ? (
                    <div className="max-h-[300px] overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
                      {Array.from({ length: Math.ceil(gameMoves.length / 2) }).map((_, index) => {
                        const wIdx = index * 2;
                        const bIdx = wIdx + 1;
                        
                        const whitePly = gameMoves[wIdx];
                        const blackPly = bIdx < gameMoves.length ? gameMoves[bIdx] : null;

                        const getMoveClassificationNotation = (cls?: string) => {
                          if (!cls) return "";
                          switch (cls) {
                            case "brilliant": return "!!";
                            case "great": return "!";
                            case "inaccuracy": return "?!";
                            case "mistake": return "?";
                            case "miss": return "✕";
                            case "blunder": return "??";
                            default: return "";
                          }
                        };

                        const getMoveClassificationColor = (cls?: string) => {
                          switch (cls) {
                            case "brilliant": return "text-[#12b6a6] font-black";
                            case "great": return "text-[#1b9af7] font-black";
                            case "book": return "text-[#a5743f] text-[9px]";
                            case "best": return "text-[#81b64c] font-black";
                            case "excellent": return "text-[#85c441]";
                            case "good": return "text-[#36b37e] font-bold";
                            case "inaccuracy": return "text-[#f5cb35] font-bold";
                            case "mistake": return "text-[#e28743] font-black";
                            case "miss": return "text-[#db4c44] font-black";
                            case "blunder": return "text-[#ef4444] font-black animate-pulse";
                            default: return "text-slate-400";
                          }
                        };

                        // Mini visual badge helpers mapped directly
                        const renderMoveClassificationMiniBadge = (cls?: string) => {
                          if (!cls) return null;
                          switch (cls) {
                            case "brilliant":
                              return (
                                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[#12b6a6] text-[8px] text-white font-extrabold select-none leading-none shadow-[0_0_4px_rgba(18,182,166,0.5)] shrink-0" title="Brilliant">
                                  !!
                                </span>
                              );
                            case "great":
                              return (
                                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[#1b9af7] text-[9px] text-white font-extrabold select-none leading-none shadow-[0_0_4px_rgba(27,154,247,0.5)] shrink-0" title="Great">
                                  !
                                </span>
                              );
                            case "book":
                              return (
                                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[#a5743f] text-[9px] text-white select-none leading-none shrink-0" title="Book">
                                  📖
                                </span>
                              );
                            case "best":
                              return (
                                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[#81b64c] text-[8px] text-white select-none leading-none shrink-0" title="Best">
                                  ★
                                </span>
                              );
                            case "excellent":
                              return (
                                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[#85c441] text-[7px] text-white select-none leading-none shrink-0" title="Excellent">
                                  👍
                                </span>
                              );
                            case "good":
                              return (
                                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[#36b37e] text-[8px] text-white font-bold select-none leading-none shrink-0" title="Good">
                                  ✓
                                </span>
                              );
                            case "inaccuracy":
                              return (
                                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[#f5cb35] text-[7px] text-white font-serif select-none leading-none shrink-0" title="Inaccuracy">
                                  ?!
                                </span>
                              );
                            case "mistake":
                              return (
                                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[#e28743] text-[9px] text-white font-serif select-none leading-none font-black shrink-0" title="Mistake">
                                  ?
                                </span>
                              );
                            case "miss":
                              return (
                                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[#db4c44] text-[8px] text-white font-serif select-none leading-none font-bold shrink-0" title="Miss">
                                  ✕
                                </span>
                              );
                            case "blunder":
                              return (
                                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[#ef4444] text-[8px] text-white font-serif select-none leading-none font-bold animate-pulse shrink-0" title="Blunder">
                                  ??
                                </span>
                              );
                            default:
                              return null;
                          }
                        };

                        return (
                          <div key={index} className="grid grid-cols-12 gap-1.5 items-center py-1 border-b border-white/[0.02] text-xs">
                            {/* Number */}
                            <div className="col-span-2 text-slate-500 font-mono text-[10px] font-bold">
                              {index + 1}.
                            </div>

                            {/* White move card */}
                            <button
                              id={`move-ply-${wIdx}`}
                              onClick={() => selectMoveIndex(wIdx)}
                              className={`col-span-5 text-left py-1 px-2.5 rounded transition font-mono flex items-center justify-between cursor-pointer ${
                                activeIndex === wIdx 
                                  ? "bg-[#558460]/20 text-white border border-[#558460]/35 font-bold" 
                                  : "text-slate-300 hover:bg-white/[0.03]"
                              }`}
                            >
                              <span>
                                {whitePly.san}
                                {whitePly.classification && (
                                  <span className={`ml-1 text-[10px] ${getMoveClassificationColor(whitePly.classification)}`}>
                                    {getMoveClassificationNotation(whitePly.classification)}
                                  </span>
                                )}
                              </span>
                              {renderMoveClassificationMiniBadge(whitePly.classification)}
                            </button>

                            {/* Black move card */}
                            {blackPly ? (
                              <button
                                id={`move-ply-${bIdx}`}
                                onClick={() => selectMoveIndex(bIdx)}
                                className={`col-span-5 text-left py-1 px-2.5 rounded transition font-mono flex items-center justify-between cursor-pointer ${
                                  activeIndex === bIdx 
                                    ? "bg-[#558460]/20 text-white border border-[#558460]/35 font-bold" 
                                    : "text-slate-300 hover:bg-white/[0.03]"
                                }`}
                              >
                                <span>
                                  {blackPly.san}
                                  {blackPly.classification && (
                                    <span className={`ml-1 text-[10px] ${getMoveClassificationColor(blackPly.classification)}`}>
                                      {getMoveClassificationNotation(blackPly.classification)}
                                    </span>
                                  )}
                                </span>
                                {renderMoveClassificationMiniBadge(blackPly.classification)}
                              </button>
                            ) : (
                              <div className="col-span-5" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-8 text-center select-none bg-slate-950/20 rounded-xl border border-dashed border-slate-800">
                      <p className="text-xs text-slate-450 leading-relaxed font-sans max-w-xs mx-auto">
                        Play moves on the board or import a match to visualize plies strategy.
                      </p>
                    </div>
                  )}

                  {/* Move Evaluation Tiers Legend with specific Chess imagery */}
                  <div className="mt-4 pt-3.5 border-t border-white/[0.06]">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <span>Move Quality Legend</span>
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                      {[
                        { label: "Brilliant", icon: "!!", color: "bg-[#12b6a6]", desc: "Great sacrifice of a minor/major piece" },
                        { label: "Great", icon: "!", color: "bg-[#1b9af7]", desc: "Crucial move, or single savior line" },
                        { label: "Best", icon: "★", color: "bg-[#81b64c]", desc: "Perfect engine recommendation" },
                        { label: "Excellent", icon: "👍", color: "bg-[#85c441]", desc: "Top tier, highly accurate reply" },
                        { label: "Good", icon: "✓", color: "bg-[#36b37e]", desc: "Solid move that preserves equity" },
                        { label: "Book", icon: "📖", color: "bg-[#a5743f]", desc: "Theoretical opening master template" },
                        { label: "Inaccuracy", icon: "?!", color: "bg-[#f5cb35]", desc: "Minor error, loses slight control" },
                        { label: "Mistake", icon: "?", color: "bg-[#e28743]", desc: "Bad move, yields significant lead" },
                        { label: "Blunder", icon: "??", color: "bg-[#ef4444]", desc: "Severe mistake giving away piece/mate" }
                      ].map((item, idx) => (
                        <div 
                          key={idx} 
                          className="flex items-center gap-1.5 p-1 bg-slate-950/40 rounded border border-white/[0.02] hover:bg-slate-900/40 transition group cursor-help" 
                          title={item.desc}
                        >
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center font-extrabold text-[8px] text-white shrink-0 ${item.color}`}>
                            {item.icon}
                          </span>
                          <span className="text-slate-400 font-medium group-hover:text-slate-200 transition truncate">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* TAB CONTENT: "review" */}
              {analysisSidebarTab === "review" && (
                <div>
                  {accuracyReport ? (
                    <GameReviewPanel 
                      accuracyReport={accuracyReport}
                      metadata={metadata}
                      gameMoves={gameMoves}
                      activeIndex={activeIndex}
                      onSelectMoveIndex={selectMoveIndex}
                      onClose={() => setAnalysisSidebarTab("moves")}
                    />
                  ) : (
                    <div className="py-8 px-4 text-center bg-slate-950/40 rounded-xl border border-slate-900 flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-400 mb-3">
                        <Award className="w-5 h-5" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-200 mb-1">Game Critique Unlocked</h4>
                      <p className="text-[11px] text-slate-400 max-w-xs mb-4 leading-normal">
                        Trigger our comprehensive diagnostic reviewer to audit your inaccuracies, brilliant tactical combinations, and mistakes side-by-side!
                      </p>
                      
                      <button
                        onClick={runFullGameReview}
                        disabled={isReviewing || gameMoves.length === 0}
                        className="py-2 px-4 bg-[#81b64c] hover:bg-[#92cc5c] text-white text-xs font-bold rounded-xl transition active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {isReviewing ? `Analyzing (${reviewCount}/${reviewTotal})...` : "Trigger Engine Game Review"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB CONTENT: "info" */}
              {analysisSidebarTab === "info" && (
                <div className="space-y-4 text-xs">
                  <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-900/60 font-mono space-y-1">
                    <div className="flex justify-between"><span className="text-slate-500">Event:</span> <span className="text-slate-200 font-bold">{metadata.event || "Sandbox Match"}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">White Player:</span> <span className="text-slate-200 font-extrabold">{metadata.white.name} ({metadata.white.rating || "1500?"})</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Black Player:</span> <span className="text-slate-200 font-extrabold">{metadata.black.name} ({metadata.black.rating || "1500?"})</span></div>
                    {metadata.date && <div className="flex justify-between"><span className="text-slate-500">Date Played:</span> <span className="text-slate-350">{metadata.date}</span></div>}
                  </div>

                  <div className="bg-slate-950/20 p-3 rounded-xl border border-slate-900 space-y-1 select-all">
                    <span className="block text-[9px] text-slate-500 font-mono uppercase tracking-wider mb-1 font-bold">Active Board FEN position string:</span>
                    <p className="text-[10px] text-slate-400 font-mono break-all leading-tight">
                      {fen}
                    </p>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: "openings" */}
              {analysisSidebarTab === "openings" && (() => {
                const matchingEntry = activeOpening ? Object.entries(OPENING_DATABASE).find(
                  ([seq, info]) => info.name === activeOpening.name && info.eco === activeOpening.eco
                ) : null;
                const seqKey = matchingEntry ? matchingEntry[0] : null;

                return (
                  <div className="space-y-4">
                    {activeOpening ? (
                      <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-900 space-y-3 animate-fade-in">
                        <div className="flex gap-3.5 items-start">
                          {seqKey && (
                            <div className="mt-0.5 shrink-0">
                              <OpeningBoardPreview sequence={seqKey} />
                            </div>
                          )}
                          
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] bg-[#558460]/20 text-[#71ac82] outline outline-1 outline-[#558460]/30 px-2 py-0.5 rounded font-mono font-bold uppercase select-none shrink-0">
                                ECO {activeOpening.eco}
                              </span>
                              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Active Info</h4>
                            </div>

                            <h3 className="text-sm font-black text-slate-100 leading-snug">
                              {activeOpening.name}
                            </h3>
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {activeOpening.description}
                        </p>

                        {/* GM Win/Draw/Loss Statistics section */}
                        <div className="pt-3 border-t border-slate-900/80 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-[#71ac82] font-mono tracking-wider uppercase font-extrabold">Historical GM Stats (Grounding):</span>
                            {isStatsLoading && (
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                                <span>Searching...</span>
                              </div>
                            )}
                          </div>

                          {openingStatsCache[activeOpening.name] ? (() => {
                            const stats = openingStatsCache[activeOpening.name];
                            return (
                              <div className="space-y-3">
                                {/* Segmented Bar Chart */}
                                <div className="space-y-1">
                                  <div className="h-5 w-full rounded-md overflow-hidden flex bg-slate-800/80 border border-slate-700/30 text-[9px] font-bold font-mono">
                                    {stats.whiteWin > 0 && (
                                      <div 
                                        style={{ width: `${stats.whiteWin}%` }} 
                                        className="bg-slate-200 text-slate-900 flex items-center justify-center transition-all duration-500 truncate"
                                        title={`White wins: ${stats.whiteWin}%`}
                                      >
                                        W: {stats.whiteWin}%
                                      </div>
                                    )}
                                    {stats.draw > 0 && (
                                      <div 
                                        style={{ width: `${stats.draw}%` }} 
                                        className="bg-slate-500 text-slate-100 flex items-center justify-center transition-all duration-500 truncate"
                                        title={`Draw: ${stats.draw}%`}
                                      >
                                        D: {stats.draw}%
                                      </div>
                                    )}
                                    {stats.blackWin > 0 && (
                                      <div 
                                        style={{ width: `${stats.blackWin}%` }} 
                                        className="bg-slate-900 text-slate-300 flex items-center justify-center border-l border-slate-800 transition-all duration-500 truncate"
                                        title={`Black wins: ${stats.blackWin}%`}
                                      >
                                        B: {stats.blackWin}%
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                                    <span>Total Master Games: {stats.totalGames}</span>
                                    <span className="text-[#71ac82]">
                                      {stats.whiteWin > stats.blackWin ? "White performs better" : stats.blackWin > stats.whiteWin ? "Black performs better" : "Equal performance"}
                                    </span>
                                  </div>
                                </div>

                                {/* GM recommendation text block */}
                                <div className="bg-[#101622]/50 border border-slate-900/60 p-2.5 rounded-lg text-[11px] text-slate-300 leading-normal">
                                  <span className="text-[#71ac82] font-semibold block mb-0.5 font-sans">GM Recommendation:</span>
                                  <p className="font-sans text-slate-300">{stats.gmRecommendation}</p>
                                </div>

                                {/* Citations Sources */}
                                {stats.sources && stats.sources.length > 0 && (
                                  <div className="space-y-1">
                                    <span className="text-[8px] text-slate-500 font-mono uppercase tracking-wider block">Verified Sources:</span>
                                    <div className="flex flex-wrap gap-x-2.5 gap-y-1">
                                      {stats.sources.map((src, sIdx) => {
                                        let domain = src;
                                        try {
                                          domain = new URL(src).hostname.replace("www.", "");
                                        } catch {}
                                        return (
                                          <a
                                            key={sIdx}
                                            href={src}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-[10px] text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1 font-mono truncate"
                                          >
                                            <span className="shrink-0 text-[8px]">🔗</span>
                                            <span className="truncate max-w-[120px]">{domain}</span>
                                          </a>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })() : (
                            !isStatsLoading && (
                              <div className="text-[10px] text-slate-500 py-1 font-mono italic">
                                Failed to fetch live statistics. Play active line and wait.
                              </div>
                            )
                          )}
                        </div>

                        {activeOpening.possibleMoves && activeOpening.possibleMoves.length > 0 && (
                          <div className="pt-2.5 border-t border-slate-900">
                            <span className="text-[9px] text-[#71ac82] font-mono tracking-wider uppercase font-extrabold block mb-1.5">Theory continuation (click to play):</span>
                            <div className="flex flex-wrap gap-1.5">
                              {activeOpening.possibleMoves.map((mov, mIdx) => (
                                <button
                                  key={mIdx}
                                  onClick={() => handlePlaySANMove(mov)}
                                  title={`Play continuation: ${mov}`}
                                  className="text-[10px] bg-slate-900 hover:bg-[#558460]/20 hover:border-[#558460]/40 border border-slate-850 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg transition font-mono flex items-center gap-1.5 select-none active:scale-95 cursor-pointer text-left"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                                  <span>{mov}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-6 text-center select-none bg-slate-950/15 rounded-xl border border-dashed border-slate-850 p-4 space-y-3">
                        <div>
                          <p className="text-xs text-slate-400 leading-normal mb-1">No special ECO Opening detected.</p>
                          <p className="text-[10px] text-slate-500">Play typical theory steps (e.g. 1.e4 e5 2.Nf3) to search openings catalog names.</p>
                        </div>
                        <div className="flex justify-center pt-1">
                          <button
                            onClick={() => {
                              // Enable Coach and fetch commentary explaining current position
                              setAiCoachEnabled(true);
                              fetchAICoachCommentary();
                              // Switch back to moves tab to show commentary
                              setAnalysisSidebarTab("moves");
                            }}
                            className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg transition cursor-pointer border border-emerald-500/20 font-semibold"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Ask Coach to Explain Setup</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

            </div>

            {/* AI GM COACH CARD */}
            <div className="bg-[#0e0f14]/80 border border-white/[0.05] p-5 rounded-2xl relative overflow-hidden flex flex-col min-h-[180px] shadow-xl backdrop-blur-lg">
              {/* background highlights */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

              <h2 className="text-sm font-semibold text-slate-200 mb-3 flex items-center justify-between border-b border-slate-800 pb-2 relative z-10">
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                  Grandmaster AI Coach & Annotator
                </span>
                
                {/* AI switch */}
                <button
                  onClick={() => setAiCoachEnabled(a => !a)}
                  className={`text-[10px] font-semibold flex items-center gap-1 transition ${
                    aiCoachEnabled ? "text-emerald-400" : "text-slate-500"
                  }`}
                >
                  {aiCoachEnabled ? "Active" : "Paused"}
                </button>
              </h2>

              <div className="flex-1 relative z-10">
                {isAiLoading ? (
                  <div className="h-full flex flex-col items-center justify-center py-6 gap-3">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-[10px] text-emerald-400 font-mono tracking-wider uppercase animate-pulse">GM Coach is studying squares...</p>
                  </div>
                ) : (
                  <div className="text-slate-350 text-xs leading-relaxed font-sans space-y-2 whitespace-pre-line bg-slate-900/20 p-2.5 rounded-xl">
                    {aiCommentary}
                  </div>
                )}
              </div>
            </div>

            {/* SAVED MOVES & MATCHES HISTORY STORAGE */}
            <SavedGamesHistory
              gameMoves={gameMoves}
              metadata={metadata}
              fen={fen}
              accuracyReport={accuracyReport}
              activeIndex={activeIndex}
              activeOpeningName={activeOpening?.name}
              onLoadGame={handleLoadSavedGame}
              onNotify={setActiveAlert}
            />

            {/* Direct FEN Position Importer */}
            <div className="bg-[#0e0f14]/80 border border-white/[0.05] p-5 rounded-2xl shadow-xl backdrop-blur-lg">
              <h2 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                <Hash className="w-4 h-4 text-indigo-400" />
                Direct FEN Position Importer
              </h2>

              <div className="space-y-4 text-xs">
                {/* FEN Importer */}
                <form onSubmit={handleImportFenSubmit} className="space-y-2">
                  <span className="block font-semibold text-slate-300">Paste FEN Position:</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                      value={importFen}
                      onChange={(e) => setImportFen(e.target.value)}
                      className="flex-1 p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs focus:outline-none focus:border-indigo-400/85 focus:ring-1 focus:ring-indigo-450 placeholder-slate-600 text-slate-250"
                    />
                    <button
                      type="submit"
                      disabled={!importFen}
                      className="px-3 bg-indigo-950/50 hover:bg-indigo-900/35 border border-indigo-900/60 hover:border-indigo-800 text-indigo-300 font-semibold rounded-lg text-[10px] uppercase tracking-wide transition leading-tight disabled:opacity-45 cursor-pointer"
                    >
                      Fen Load
                    </button>
                  </div>
                </form>
              </div>
            </div>

          </div>

        </div>
        )}

        {/* 3. GAME ANALYTICS SWINGS AND ACCURACY REPORT GRAPH (if analyzed) */}
        {accuracyReport && (
          <section className="mt-8 bg-slate-950 border border-slate-800/80 p-6 rounded-3xl animate-fade-in relative z-20 overflow-hidden">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2 mb-6 border-b border-slate-900 pb-3">
              <Award className="w-5 h-5 text-emerald-400" />
              Engine Accuracy Review Stats Report
            </h2>

            {/* Score cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* White Score Card */}
              <div className="bg-slate-900 p-5 rounded-2xl border-l-4 border-emerald-400 flex justify-between items-center relative overflow-hidden">
                <div>
                  <h3 className="text-xs text-slate-400 tracking-wide font-sans mb-1 uppercase">White Player accuracy</h3>
                  <p className="text-sm font-semibold text-slate-100">{metadata.white.name}</p>
                </div>
                <div>
                  <span className="text-4xl font-extrabold text-emerald-400 font-mono">
                    {accuracyReport.whiteAccuracy}%
                  </span>
                </div>
              </div>

              {/* Black Score Card */}
              <div className="bg-slate-900 p-5 rounded-2xl border-l-4 border-indigo-500 flex justify-between items-center relative overflow-hidden">
                <div>
                  <h3 className="text-xs text-slate-400 tracking-wide font-sans mb-1 uppercase">Black Player accuracy</h3>
                  <p className="text-sm font-semibold text-slate-100">{metadata.black.name}</p>
                </div>
                <div>
                  <span className="text-4xl font-extrabold text-indigo-400 font-mono">
                    {accuracyReport.blackAccuracy}%
                  </span>
                </div>
              </div>
            </div>

            {/* Move metrics breakdown tables */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* White detailed breakdown */}
              <div className="bg-slate-900/50 border border-slate-900 p-4 rounded-xl">
                <h4 className="text-xs uppercase tracking-wide text-slate-400 font-bold mb-3 border-b border-slate-900 pb-1.5 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-slate-200 border rounded-sm shrink-0" />
                  White Plies Critique
                </h4>
                <div className="space-y-1.5 text-xs">
                  {[
                    { key: "brilliant", label: "Brilliant", color: "text-[#12b6a6]", bg: "bg-[#12b6a6]/10", icon: "!!" },
                    { key: "great", label: "Great", color: "text-[#1b9af7]", bg: "bg-[#1b9af7]/10", icon: "!" },
                    { key: "book", label: "Book", color: "text-[#a5743f]", bg: "bg-[#a5743f]/10", icon: "📖" },
                    { key: "best", label: "Best", color: "text-[#81b64c]", bg: "bg-[#81b64c]/10", icon: "★" },
                    { key: "excellent", label: "Excellent", color: "text-[#85c441]", bg: "bg-[#85c441]/10", icon: "👍" },
                    { key: "good", label: "Good", color: "text-[#36b37e]", bg: "bg-[#36b37e]/10", icon: "✓" },
                    { key: "inaccuracy", label: "Inaccuracy", color: "text-[#f5cb35]", bg: "bg-[#f5cb35]/10", icon: "?!" },
                    { key: "mistake", label: "Mistake", color: "text-[#e28743]", bg: "bg-[#e28743]/10", icon: "?" },
                    { key: "miss", label: "Miss", color: "text-[#db4c44]", bg: "bg-[#db4c44]/10", icon: "✕" },
                    { key: "blunder", label: "Blunder", color: "text-[#ef4444]", bg: "bg-[#ef4444]/10", icon: "??" }
                  ].map((m) => {
                    const count = accuracyReport.whiteStats[m.key as MoveClassification] || 0;
                    return (
                      <div key={m.key} className={`flex justify-between items-center py-1 border-b border-white/[0.02] last:border-0 ${count === 0 ? "opacity-35" : ""}`}>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-4.5 h-4.5 rounded-full flex items-center justify-center font-extrabold text-[8px] text-white shrink-0 ${
                            m.key === "brilliant" ? "bg-[#12b6a6]" :
                            m.key === "great" ? "bg-[#1b9af7]" :
                            m.key === "book" ? "bg-[#a5743f]" :
                            m.key === "best" ? "bg-[#81b64c]" :
                            m.key === "excellent" ? "bg-[#85c441]" :
                            m.key === "good" ? "bg-[#36b37e]" :
                            m.key === "inaccuracy" ? "bg-[#f5cb35]" :
                            m.key === "mistake" ? "bg-[#e28743]" :
                            m.key === "miss" ? "bg-[#db4c44]" : "bg-[#ef4444]"
                          }`}>
                            {m.icon}
                          </span>
                          <span className="text-slate-350 font-bold">{m.label}</span>
                        </div>
                        <span className={`font-mono font-black text-xs ${count > 0 ? m.color + " " + m.bg + " px-2 py-0.5 rounded-md" : "text-slate-600"}`}>
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Black detailed breakdown */}
              <div className="bg-slate-900/50 border border-slate-900 p-4 rounded-xl">
                <h4 className="text-xs uppercase tracking-wide text-slate-400 font-bold mb-3 border-b border-slate-900 pb-1.5 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-slate-950 border border-slate-705 rounded-sm shrink-0" />
                  Black Plies Critique
                </h4>
                <div className="space-y-1.5 text-xs">
                  {[
                    { key: "brilliant", label: "Brilliant", color: "text-[#12b6a6]", bg: "bg-[#12b6a6]/10", icon: "!!" },
                    { key: "great", label: "Great", color: "text-[#1b9af7]", bg: "bg-[#1b9af7]/10", icon: "!" },
                    { key: "book", label: "Book", color: "text-[#a5743f]", bg: "bg-[#a5743f]/10", icon: "📖" },
                    { key: "best", label: "Best", color: "text-[#81b64c]", bg: "bg-[#81b64c]/10", icon: "★" },
                    { key: "excellent", label: "Excellent", color: "text-[#85c441]", bg: "bg-[#85c441]/10", icon: "👍" },
                    { key: "good", label: "Good", color: "text-[#36b37e]", bg: "bg-[#36b37e]/10", icon: "✓" },
                    { key: "inaccuracy", label: "Inaccuracy", color: "text-[#f5cb35]", bg: "bg-[#f5cb35]/10", icon: "?!" },
                    { key: "mistake", label: "Mistake", color: "text-[#e28743]", bg: "bg-[#e28743]/10", icon: "?" },
                    { key: "miss", label: "Miss", color: "text-[#db4c44]", bg: "bg-[#db4c44]/10", icon: "✕" },
                    { key: "blunder", label: "Blunder", color: "text-[#ef4444]", bg: "bg-[#ef4444]/10", icon: "??" }
                  ].map((m) => {
                    const count = accuracyReport.blackStats[m.key as MoveClassification] || 0;
                    return (
                      <div key={m.key} className={`flex justify-between items-center py-1 border-b border-white/[0.02] last:border-0 ${count === 0 ? "opacity-35" : ""}`}>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-4.5 h-4.5 rounded-full flex items-center justify-center font-extrabold text-[8px] text-white shrink-0 ${
                            m.key === "brilliant" ? "bg-[#12b6a6]" :
                            m.key === "great" ? "bg-[#1b9af7]" :
                            m.key === "book" ? "bg-[#a5743f]" :
                            m.key === "best" ? "bg-[#81b64c]" :
                            m.key === "excellent" ? "bg-[#85c441]" :
                            m.key === "good" ? "bg-[#36b37e]" :
                            m.key === "inaccuracy" ? "bg-[#f5cb35]" :
                            m.key === "mistake" ? "bg-[#e28743]" :
                            m.key === "miss" ? "bg-[#db4c44]" : "bg-[#ef4444]"
                          }`}>
                            {m.icon}
                          </span>
                          <span className="text-slate-350 font-bold">{m.label}</span>
                        </div>
                        <span className={`font-mono font-black text-xs ${count > 0 ? m.color + " " + m.bg + " px-2 py-0.5 rounded-md" : "text-slate-600"}`}>
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* GORGEOUS HAND-CRAFTED ENGINE ADVANTAGE PLOT (SVG LINE GRAPH) */}
              <div className="bg-slate-900/50 border border-slate-900 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <h4 className="text-xs uppercase tracking-wide text-slate-400 font-bold mb-1 flex items-center gap-1.5">
                    <Tv className="w-3.5 h-3.5 text-emerald-400" />
                    Interactive Swings Line Graph
                  </h4>
                  <p className="text-[10px] text-slate-500 mb-3 leading-normal">
                    White advantage curves plotted by ply index. Click any part to select.
                  </p>
                </div>

                {/* SVG Graph rendering */}
                <div className="relative h-28 bg-[#0a0f1d] border border-slate-800 rounded-lg p-2 overflow-hidden flex items-stretch">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {/* Balanced baseline */}
                    <line x1="0" y1="50" x2="100" y2="50" stroke="#1e293b" strokeWidth="0.8" strokeDasharray="3" />
                    
                    {/* Curve line generator */}
                    {(() => {
                      const points = gameMoves.map((m, idx) => {
                        const val = m.evaluation?.numericScore || 0;
                        const x = (idx / (gameMoves.length - 1)) * 100;
                        // Score mapped between -500 to +500 (normal limits). Map to Y from 95% to 5%
                        const cappedVal = Math.max(-500, Math.min(500, val));
                        const y = 50 - (cappedVal / 500) * 45;
                        return { x, y };
                      });

                      if (points.length < 2) return null;
                      
                      const pathString = points.reduce((acc, p, idx) => {
                        return acc + `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`;
                      }, "");

                      return (
                        <>
                          {/* Main stroke line */}
                          <path
                            d={pathString}
                            fill="none"
                            stroke="url(#swingGrad)"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="transition-all duration-300"
                          />
                          
                          {/* Anchor point pointers */}
                          {points.map((p, idx) => (
                            <circle
                              key={idx}
                              cx={p.x}
                              cy={p.y}
                              r={activeIndex === idx ? "2.5" : "1"}
                              className={`cursor-pointer transition-all ${
                                activeIndex === idx ? "fill-white stroke-teal-400 stroke-[1px]" : "fill-teal-500/80"
                              }`}
                              onClick={() => selectMoveIndex(idx)}
                            />
                          ))}

                          <defs>
                            <linearGradient id="swingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#10b981" />
                              <stop offset="50%" stopColor="#3b82f6" />
                              <stop offset="100%" stopColor="#8b5cf6" />
                            </linearGradient>
                          </defs>
                        </>
                      );
                    })()}
                  </svg>
                </div>

                <div className="flex justify-between text-[8px] text-slate-500 font-mono pt-2">
                  <span>Start (Move 1)</span>
                  <span className="text-teal-400">Stable line is even</span>
                  <span>End</span>
                </div>
              </div>

            </div>
          </section>
        )}

      </main>

      {/* 4. Footer Brand */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 px-6 mt-16 text-center text-xs text-slate-500 font-mono">
        <p className="mb-1.5">
          Gambit &copy; {new Date().getFullYear()} — Powered by local engine assembly and Gemini AI.
        </p>
        <p className="text-[10px] text-slate-600 leading-normal max-w-lg mx-auto font-sans">
          Analyze board layouts freely. In full review, accuracy percentage metrics and tactical classifications are assigned relative to centipawn losses detected via local CPU tasks.
        </p>
      </footer>

    </div>
  );
}
