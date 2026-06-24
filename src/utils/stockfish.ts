import { Evaluation } from "../types";

let cachedStockfishCode: string | null = null;
let isFetchingStockfish = false;
const stockfishFetchPromises: ((code: string) => void)[] = [];

async function getStockfishCode(): Promise<string> {
  if (cachedStockfishCode !== null) return cachedStockfishCode;
  if (isFetchingStockfish) {
    return new Promise((resolve) => {
      stockfishFetchPromises.push(resolve);
    });
  }
  isFetchingStockfish = true;
  try {
    const res = await fetch("https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js");
    if (res.ok) {
      cachedStockfishCode = await res.text();
    } else {
      throw new Error(`HTTP status ${res.status}`);
    }
  } catch (err) {
    console.warn("Failed to fetch Stockfish script from CDN on main thread:", err);
    cachedStockfishCode = ""; // Empty string on failure to prevent repeated failing network requests
  } finally {
    isFetchingStockfish = false;
    const promises = [...stockfishFetchPromises];
    stockfishFetchPromises.length = 0;
    for (const resolve of promises) {
      resolve(cachedStockfishCode || "");
    }
  }
  return cachedStockfishCode || "";
}

export class StockfishEngine {
  private worker: Worker | null = null;
  private onEvalCallback?: (evaluation: Evaluation) => void;
  private onReadyCallback?: () => void;
  private activeFen: string = "";
  private isWhiteToMove: boolean = true;
  private isReady: boolean = false;

  constructor(
    onEval: (evaluation: Evaluation) => void,
    onReady?: () => void
  ) {
    this.onEvalCallback = onEval;
    this.onReadyCallback = onReady;
    this.initWorker();
  }

  private async initWorker() {
    try {
      const code = await getStockfishCode();
      if (!code) {
        console.warn("Stockfish CDN code unavailable. Initializing mock response ready state safely.");
        // Simulate engine readiness to prevent UI hanging
        setTimeout(() => {
          this.isReady = true;
          if (this.onReadyCallback) this.onReadyCallback();
        }, 50);
        return;
      }

      // Use the Blob proxy trick to run Stockfish safely.
      // Since the full source code is fetched on the main thread with proper CORS handling,
      // we inject it directly inside the Blob, completely avoiding cross-origin 'importScripts' inside the Worker.
      const blobCode = `
        self.onerror = function(e) {
          console.warn("Suppressed worker-internal error inside Stockfish sandbox:", e);
          if (e && typeof e.preventDefault === 'function') e.preventDefault();
          return true;
        };
        self.addEventListener('error', function(e) {
          console.warn("Suppressed worker-internal event error inside Stockfish sandbox:", e);
          try {
            e.preventDefault();
            e.stopPropagation();
            if (typeof e.stopImmediatePropagation === 'function') {
              e.stopImmediatePropagation();
            }
          } catch (err) {}
        }, true);

        // Safe wrapper for importScripts to prevent uncaught network exceptions for auxiliary Emscripten files (.mem, etc)
        const originalImportScripts = self.importScripts;
        self.importScripts = function(...args) {
          try {
            if (originalImportScripts) {
              return originalImportScripts.apply(this, args);
            }
          } catch (e) {
            console.warn("Suppressed importScripts error inside Stockfish worker:", e);
          }
        };

        try {
          ${code}
        } catch (e) {
          console.warn("Gracefully caught Stockfish execution failure inside web worker:", e);
          postMessage("readyok"); // Fallback to avoid hanging ready state
        }
      `;
      const blob = new Blob([blobCode], { type: "application/javascript" });
      const workerUrl = URL.createObjectURL(blob);
      
      this.worker = new Worker(workerUrl);
      
      // Prevent sandboxed iframe Worker errors from bubbling up to system logs as "Script error"
      this.worker.onerror = (e) => {
        console.warn("Caught and handled Stockfish worker error safely in sandbox context:", e);
        try {
          e.preventDefault();
          e.stopPropagation();
          if (typeof e.stopImmediatePropagation === 'function') {
            e.stopImmediatePropagation();
          }
        } catch (err) {}
      };
      
      this.worker.onmessage = (event: MessageEvent) => {
        this.parseLine(event.data);
      };

      // Initialize UCI
      this.worker.postMessage("uci");
      this.worker.postMessage("setoption name Hash value 256");
      this.worker.postMessage("setoption name Threads value 4");
      this.worker.postMessage("setoption name UCI_AnalyseMode value true");
      this.worker.postMessage("setoption name MultiPV value 3");
      this.worker.postMessage("isready");
    } catch (err) {
      console.error("Failed to initialize Stockfish web worker:", err);
    }
  }

  private parseLine(line: string) {
    if (line === "readyok") {
      this.isReady = true;
      if (this.onReadyCallback) this.onReadyCallback();
      return;
    }

    if (line.startsWith("info depth")) {
      // Parse depth
      const depthMatch = line.match(/depth\s+(\d+)/);
      const depth = depthMatch ? parseInt(depthMatch[1], 10) : undefined;

      // Parse score: could be "cp" (centipawns) or "mate"
      const cpMatch = line.match(/score\s+cp\s+(-?\d+)/);
      const mateMatch = line.match(/score\s+mate\s+(-?\d+)/);
      
      // Parse PV (principal variation - future moves) to find the best move
      const pvMatch = line.match(/pv\s+([a-h][1-8][a-h][1-8][qrbn]?)/);
      const bestMove = pvMatch ? pvMatch[1] : undefined;

      let scoreStr = "0.00";
      let numericScore = 0;

      if (cpMatch) {
        const rawScore = parseInt(cpMatch[1], 10);
        
        // Stockfish evaluates from the perspective of the side to move.
        // We normalize it: if it is Black to move, we reverse the score so numericScore is ALWAYS from White's perspective (+ is White advantage, - is Black advantage)
        numericScore = this.isWhiteToMove ? rawScore : -rawScore;
        
        // Format for friendly viewing (e.g., +1.20 or -0.50)
        // Note: rawScore is in centipawns, so / 100
        const displayScore = (Math.abs(rawScore) / 100).toFixed(2);
        const sign = rawScore > 0 ? "+" : rawScore < 0 ? "-" : "";
        scoreStr = `${sign}${displayScore}`;
      } else if (mateMatch) {
        const mateIn = parseInt(mateMatch[1], 10);
        // Normalize mate perspective
        numericScore = this.isWhiteToMove ? (mateIn > 0 ? 10000 : -10000) : (mateIn > 0 ? -10000 : 10000);
        scoreStr = `M${Math.abs(mateIn)}`;
      }

      if (this.onEvalCallback && (cpMatch || mateMatch)) {
        this.onEvalCallback({
          score: scoreStr,
          numericScore,
          bestMove,
          depth,
        });
      }
    }
  }

  public analyzePosition(fen: string, depth: number = 20) {
    if (!this.worker) return;

    this.activeFen = fen;
    // Inspect FEN to determine who is to move
    // FEN format: [board] [active color] [castling] [en passant] [halfmove] [fullmove]
    const parts = fen.split(" ");
    this.isWhiteToMove = parts[1] === "w";

    this.worker.postMessage("stop");
    this.worker.postMessage(`position fen ${fen}`);
    this.worker.postMessage(`go depth ${depth}`);
  }

  public stop() {
    if (this.worker) {
      this.worker.postMessage("stop");
    }
  }

  public terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
