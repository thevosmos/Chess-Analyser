export interface OpeningInfo {
  name: string;
  eco: string;
  description: string;
  strategicGoal: string;
  possibleMoves: string[];
  famousPlayers: string[];
}

// Database of standard openings keyed by move sequence
export const OPENING_DATABASE: Record<string, OpeningInfo> = {
  "e4": {
    name: "King's Pawn Opening",
    eco: "B00",
    description: "The most popular opening move in chess. White immediately stakes a claim in the center, opens lines for the Queen and Light-squared Bishop.",
    strategicGoal: "Build a strong presence in the center squares d5 and f5, and prepare quick activation of kingside minor pieces.",
    possibleMoves: ["1... e5 (Open Game)", "1... c5 (Sicilian Defense)", "1... e6 (French Defense)", "1... c6 (Caro-Kann Defense)"],
    famousPlayers: ["Bobby Fischer", "Garry Kasparov", "Magnus Carlsen"]
  },
  "d4": {
    name: "Queen's Pawn Opening",
    eco: "A40",
    description: "The second most popular start. White controls e5 and prepares a solid, positional game. The queen's pawn is structurally protected by the queen, leading to closed, strategic positions.",
    strategicGoal: "Dominate the central dark squares e5 and c5. Prepare a structured expansion, often supported by c2-c4 (Queen's Gambit).",
    possibleMoves: ["1... d5 (Closed Game)", "1... Nf6 (Indian Defense)", "1... f5 (Dutch Defense)", "1... e6"],
    famousPlayers: ["Anatoly Karpov", "Ding Liren", "Levon Aronian"]
  },
  "c4": {
    name: "English Opening",
    eco: "A10",
    description: "A hypermodern flank opening. White asserts control over the d5 square from the side, delaying committing the d or e pawns. This often transposes into queen's pawn structures.",
    strategicGoal: "Control the d5 square asymmetrically. Create long-term pressure on the queenside, often fianchettoing the light-squared bishop on g2.",
    possibleMoves: ["1... e5 (Reversed Sicilian)", "1... c5 (Symmetrical)", "1... Nf6 (King's Indian setup)"],
    famousPlayers: ["Mikhail Botvinnik", "Bobby Fischer", "Garry Kasparov"]
  },
  "Nf3": {
    name: "Réti Opening",
    eco: "A04",
    description: "White plays dynamically and keeps options open. Named after Richard Réti, this hypermodern opening challenges the center with pieces rather than pawns.",
    strategicGoal: "Control e5 and d4 indirectly. Fianchetto bishops or strike central pawns later with c2-c4 or d2-d4.",
    possibleMoves: ["1... d5", "1... Nf6", "1... c5", "1... g6"],
    famousPlayers: ["Richard Réti", "Vladimir Kramnik", "Magnus Carlsen"]
  },
  "e4 c5": {
    name: "Sicilian Defense",
    eco: "B20",
    description: "Black challenges White's central e4 pawn asymmetrically with the c5 advance. It prevents White from establishing an easy dual pawn center on d4 & e4, leading to sharp, tactical struggles.",
    strategicGoal: "Black aims for counter-attacks on the queenside and rapid piece activation. White aims for robust kingside space expansion or central pawn breaks.",
    possibleMoves: ["2. Nf3 (Open Sicilian)", "2. Nc3 (Closed Sicilian)", "2. c3 (Alapin)", "2. f4 (Grand Prix)"],
    famousPlayers: ["Bobby Fischer", "Garry Kasparov", "Judit Polgar"]
  },
  "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6": {
    name: "Sicilian Defense: Najdorf Variation",
    eco: "B90",
    description: "Considered the masterclass of Sicilian open structures. Black's subtle a6 move controls b5, preparing queenside development and e5 or e6 advances while preventing piece jumps.",
    strategicGoal: "Black prepares b7-b5 or e7-e5 pushes. White counters with aggressive piece storm combinations (such as f4, g4, Be3), creating high-tension tactical lines.",
    possibleMoves: ["6. Bg5", "6. Be3 (English Attack)", "6. Be2", "6. f4"],
    famousPlayers: ["Bobby Fischer", "Garry Kasparov", "Maxime Vachier-Lagrave"]
  },
  "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5": {
    name: "Sicilian Defense: Sveshnikov Variation",
    eco: "B33",
    description: "An aggressive counter-system where Black voluntarily accepts a backward d-pawn and a hole on d5 to gain rapid piece activity and chase White's central knights.",
    strategicGoal: "Black plays for central piece activity and f7-f5 pawn breaks. White seeks to exploit the open pawn weakness on d5.",
    possibleMoves: ["6. Ndb5 d6 7. Bg5 a6 8. Na3 b5"],
    famousPlayers: ["Magnus Carlsen", "Vladimir Kramnik", "Teimour Radjabov"]
  },
  "e4 e5": {
    name: "Open Game (King's Pawn Game)",
    eco: "C20",
    description: "The classic symmetrical clash. Black matches White's pawn claims on d5 and f5, leading to classical development, open diagonals, and tactical minor piece action.",
    strategicGoal: "Secure the e5 target. Target the f7 and f2 weak points. Prepare castling and central knight activation.",
    possibleMoves: ["2. Nf3 (Main Line)", "2. f4 (King's Gambit)", "2. Nc3 (Vienna Game)", "2. Bc4 (Bishop's Opening)"],
    famousPlayers: ["Paul Morphy", "Wilhelm Steinitz", "Magnus Carlsen"]
  },
  "e4 e5 Nf3 Nc6 Bb5": {
    name: "Ruy Lopez (Spanish Opening)",
    eco: "C60",
    description: "One of the most reliable and deeply theoretical openings in history. White puts pressure on the c6 knight, which shields the critical e5 pawn.",
    strategicGoal: "White aims for gradual central control with c3 and d4. Black defends the e5 strongpoint and expands with a7-a6 and b7-b5.",
    possibleMoves: ["3... a6 (Morphy Defense)", "3... Nf6 (Berlin Defense)", "3... g6", "3... f5 (Schliemann)"],
    famousPlayers: ["Anatoly Karpov", "Garry Kasparov", "Fabiano Caruana"]
  },
  "e4 e5 Nf3 Nc6 Bc4": {
    name: "Italian Game (Giuoco Piano)",
    eco: "C50",
    description: "White places the bishop on c4, laser-focused on the weak f7 focal point. It leads to harmonious, classical setups with open play and robust tactics.",
    strategicGoal: "Secure the center with c3/d3 or d4. Black coordinates lightweight piece development and guards the critical f7 square.",
    possibleMoves: ["3... Bc5 (Giuoco Piano)", "3... Nf6 (Two Knights Defense)"],
    famousPlayers: ["Garry Kasparov", "Hikaru Nakamura", "Wesley So"]
  },
  "e4 e5 Nf3 Nf6": {
    name: "Petrov's Defense",
    eco: "C42",
    description: "An incredibly solid, symmetrical response. Black counter-attacks on e4 rather than defending e5, forcing an early symmetrical simplifying sequence.",
    strategicGoal: "Create a highly symmetrical pawn structure to neutralize White's opening initiative. Aim to castle early and fight in the center.",
    possibleMoves: ["3. Nxe5 d6 4. Nf3 Nxe4", "3. d4"],
    famousPlayers: ["Alexander Karpov", "Ian Nepomniachtchi", "Fabiano Caruana"]
  },
  "e4 e6": {
    name: "French Defense",
    eco: "C00",
    description: "A resilient, asymmetrical defense. Black prepares to support the c8-h3 diagonal and challenges the e4 pawn immediately with d7-d5, temporarily boxing in the c8 bishop.",
    strategicGoal: "Establish a secure pawn chain on d5 and e6. Attack White's central base d4 using c7-c5 punches.",
    possibleMoves: ["2. d4 d5"],
    famousPlayers: ["Mikhail Botvinnik", "Viktor Korchnoi", "Akiba Rubinstein"]
  },
  "e4 e6 d4 d5 e5": {
    name: "French Defense: Advance Variation",
    eco: "C02",
    description: "White pushes the e-pawn forward to claim space in the center and lock Black's structure. This leads to heavy positional strategy in locked pawn chains.",
    strategicGoal: "White tries to choke Black's kingside. Black attacks the foundation of the white pawn chain on d4 and c3.",
    possibleMoves: ["3... c5 4. c3 Nc6 5. Nf3 Qb6"],
    famousPlayers: ["Aron Nimzowitsch", "Alexander Grischuk", "Alexei Shirov"]
  },
  "e4 c6": {
    name: "Caro-Kann Defense",
    eco: "B12",
    description: "A rock-solid opening. Black fights for d5 by supporting it with c6, avoiding locking the light-squared bishop inside the pawn chain (unlike the French Defense).",
    strategicGoal: "Ensure a stable center, develop the light-squared bishop to f5 or g4, and then lock the e6/d5 pawn spine.",
    possibleMoves: ["2. d4 d5"],
    famousPlayers: ["Anatoly Karpov", "Mikhail Tal", "Ding Liren"]
  },
  "e4 c6 d4 d5 e5 Bf5": {
    name: "Caro-Kann Defense: Advance Variation",
    eco: "B12",
    description: "White locks the center with e5. Black develops the bishop to f5 before playing e6 to avoid structural suffocation.",
    strategicGoal: "White expands on the space edge. Black attacks the center chain with c5, Nf6, and Qb6.",
    possibleMoves: ["4. Nf3 e6 5. Be2 c5", "4. h4 (Tal Attack)"],
    famousPlayers: ["Mikhail Tal", "Anatoly Karpov", "Hikaru Nakamura"]
  },
  "d4 d5": {
    name: "Queen's Pawn Game (Closed Game)",
    eco: "D00",
    description: "The classic closed opening. Black mirrors White's pawn placement on d5, establishing a highly analytical, positional battle centered on solid structures.",
    strategicGoal: "Maintain structural balance and prepare central pawn-break tactics. White commonly launches the Queen's Gambit.",
    possibleMoves: ["2. c4 (Queen's Gambit)", "2. Nf3", "2. Bf4 (London System)"],
    famousPlayers: ["Jose Raul Capablanca", "Akiba Rubinstein", "Magnus Carlsen"]
  },
  "d4 d5 c4": {
    name: "Queen's Gambit",
    eco: "D06",
    description: "One of the oldest, most celebrated gambits. White offers a flank c-pawn to deflect Black's central d-pawn, aiming for central dominance with e4.",
    strategicGoal: "Gain a space advantage in the center. Black either accepts the pawn (aiming for blockades) or declines to hold their central anchor.",
    possibleMoves: ["2... e6 (Declined)", "2... c6 (Slav Defense)", "2... dxc4 (Accepted)"],
    famousPlayers: ["Garry Kasparov", "Alexander Alekhine", "Viswanathan Anand"]
  },
  "d4 d5 c4 e6": {
    name: "Queen's Gambit Declined",
    eco: "D30",
    description: "A hallmark of defensive excellence. Black refuses the pawn sacrifice and uses e6 to fortify the central d5 stronghold.",
    strategicGoal: "Maintain a central strongpoint on d5, gradually develop pieces, and look to break out with c7-c5 or e7-e5.",
    possibleMoves: ["3. Nc3 Nf6", "3. Nf3 Nf6"],
    famousPlayers: ["Jose Raul Capablanca", "Yefim Geller", "Bobby Fischer"]
  },
  "d4 Nf6": {
    name: "Indian Defenses",
    eco: "E00",
    description: "Hypermodern defense. Instead of mirroring d4 with d5, Black plays Nf6 to control e4, preparing to control the center indirectly with fianchetto setup.",
    strategicGoal: "Fianchetto minor pieces to strike the central d4 and e4 strongholds from a distance.",
    possibleMoves: ["2. c4 e6 (Nimzo/Queen's Indian)", "2. c4 g6 (King's Indian)", "2. Nf3"],
    famousPlayers: ["Bobby Fischer", "Garry Kasparov", "Magnus Carlsen"]
  },
  "d4 Nf6 c4 g6 Nc3 Bg7": {
    name: "King's Indian Defense",
    eco: "E60",
    description: "A highly dynamic and tactical hypermodern opening. Black allows White control of the center, then strikes back with e5 or c5, leading to crazy kingside attacks.",
    strategicGoal: "Black prepares a massive pawn push on f7-f5 for a direct mating attack on White's King. White expands on the queenside.",
    possibleMoves: ["4. e4 d6 5. Nf3 O-O"],
    famousPlayers: ["Garry Kasparov", "Bobby Fischer", "Hikaru Nakamura"]
  },
  "d4 Nf6 c4 e6 Nc3 Bb4": {
    name: "Nimzo-Indian Defense",
    eco: "E20",
    description: "One of the most highly-regarded openings in chess. Black pins the knight on c3, controlling e4 and preparing to fight for dark squares.",
    strategicGoal: "Fight for e4, damage White's pawn structure by capturing on c3, and build a positional squeeze.",
    possibleMoves: ["4. e3 (Rubinstein)", "4. Qc2 (Classical)", "4. f3"],
    famousPlayers: ["Aron Nimzowitsch", "Anatoly Karpov", "Magnus Carlsen"]
  },
  "d4 Nf6 c4 e6 Nf3 b6": {
    name: "Queen's Indian Defense",
    eco: "E12",
    description: "A premier positional defense. Black develops the light-squared bishop to b7 or a6 to control are the d4-e5 diagonals.",
    strategicGoal: "Control the e4 and d5 dark squares long-term. Establish a safe castled fortress.",
    possibleMoves: ["4. g3 Ba6", "4. a3"],
    famousPlayers: ["Anatoly Karpov", "Levon Aronian", "Wesley So"]
  }
};

// Detects the current chess opening from the move history
export function detectOpening(moves: string[]): OpeningInfo | null {
  if (moves.length === 0) return null;

  // Build sequential sequences to search for the longest match
  const maxSearchLen = Math.min(12, moves.length); // Stop checking after 12 plies
  let longestMatch: OpeningInfo | null = null;
  let longestMatchLen = 0;

  for (let len = 1; len <= maxSearchLen; len++) {
    const sequence = moves.slice(0, len).join(" ");
    if (OPENING_DATABASE[sequence]) {
      longestMatch = OPENING_DATABASE[sequence];
      longestMatchLen = len;
    }
  }

  // Fallback to first move if nothing matched but first move exists
  if (!longestMatch && moves.length > 0) {
    const firstMove = moves[0];
    if (OPENING_DATABASE[firstMove]) {
      return OPENING_DATABASE[firstMove];
    }
  }

  return longestMatch;
}
