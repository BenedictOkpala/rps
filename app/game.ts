export const HANDS = ["rock", "paper", "scissors"] as const;
export type Hand = (typeof HANDS)[number];
export type Phase = "WAITING_FOR_PLAYER" | "SHAKING" | "REVEALING" | "CHEATING" | "RESOLVED" | "COURT" | "MATCH_OVER";
export const TIMING = {
  shake: 900,
  reveal: 140 + 220, // Pose transition, then a brief settled original-hand hold.
  cheat: 300,
  recoil: 0,
  pose: 140,
  morph: 300,
  review: 1200,
  score: 280,
  courtOpen: 180,
  verdict: 260,
  victory: 450,
} as const;
export function playerPointChance(score: number): number {
  return score >= 4 ? 0 : 0.10;
}
export const COUNTER: Record<Hand, Hand> = { rock: "paper", paper: "scissors", scissors: "rock" };
export type Outcome = "you" | "ai" | "draw";
export function winner(you: Hand, ai: Hand): Outcome { return you === ai ? "draw" : COUNTER[you] === ai ? "ai" : "you"; }
export interface Round { you: Hand; original: Hand; final: Hand; cheated: boolean; outcome: Outcome }
export interface Game { phase: Phase; you: number; ai: number; roundNumber: number; round: Round | null; scored: boolean; verdict: boolean; line: string; history: Partial<Record<keyof typeof LINES, string>>; endLine: string; appealHandled: boolean }
export const initialGame: Game = { phase: "WAITING_FOR_PLAYER", you: 0, ai: 0, roundNumber: 1, round: null, scored: false, verdict: false, line: "Your move.", history: {}, endLine: "", appealHandled: false };
export function planRound(you: Hand, original: Hand, score: number, allowPoint: boolean): Round {
  const cheated = winner(you, original) === "you" && (score >= 4 || !allowPoint);
  const final = cheated ? COUNTER[you] : original;
  return { you, original, final, cheated, outcome: winner(you, final) };
}
export const LINES = {
  early: ["I've got time.", "Go ahead.", "Try me.", "I'm still working. I can do both.", "Let's see what you've got.", "Your move."],
  cheat: ["I picked that.", "What?", "I didn't change anything.", "Check again.", "Looks right to me.", "I won.", "Prove it.", "Take me to court."],
  ai: ["Didn't even have to cheat.", "I didn't touch a thing.", "That one was actually fair.", "See? I can win normally.", "Completely legal."],
  you: ["Fine.", "Enjoy it.", "Take your point.", "Don't get comfortable.", "I'll allow it."],
  draw: ["Again.", "Nothing happened.", "Next.", "Run it back."],
  carry: ["Good decision.", "Thought so.", "Wise.", "Let's keep moving."],
  end: ["Let's go again. I promise not to cheat.", "Okay. This time I'll actually play fair.", "Fresh match. Clean slate.", "No cheating this time. Promise.", "You almost had me. Again?"]
};
// Remember each pool independently: SHOOT/continuation text cannot cause repeats.
function speak(state: Game, pool: keyof typeof LINES): Game {
  const lines = LINES[pool];
  const line = lines[(lines.indexOf(state.history[pool] ?? "") + 1) % lines.length];
  return { ...state, line, history: { ...state.history, [pool]: line } };
}
export function canAppeal(state: Game): boolean {
  return (state.phase === "RESOLVED" || state.phase === "MATCH_OVER") && !!state.round?.cheated && !state.appealHandled;
}
export type Action = { type: "CHOOSE"; hand: Hand; original: Hand; allow: boolean } | { type: "TICK"; line?: string } | { type: "COURT" } | { type: "NEXT"; line?: string } | { type: "RESET" };
export function reducer(state: Game, action: Action): Game {
  // Dialogue history survives replay; all live match/round/court state resets.
  if (action.type === "RESET") return { ...initialGame, history: state.history };
  if (action.type === "CHOOSE") {
    if (state.phase !== "WAITING_FOR_PLAYER") return state;
    return { ...state, phase: "SHAKING", round: planRound(action.hand, action.original, state.you, action.allow), scored: false, verdict: false, appealHandled: false, line: "Rock. Paper. Scissors." };
  }
  if (action.type === "COURT" && canAppeal(state)) return { ...state, phase: "COURT", verdict: false };
  if (action.type === "NEXT" && (state.phase === "RESOLVED" || canAppeal(state) || (state.phase === "COURT" && state.verdict))) {
    if (state.ai >= 5) return { ...state, phase: "MATCH_OVER", appealHandled: true, line: state.endLine };
    const continued = state.phase === "RESOLVED" && state.round?.cheated ? speak(state, "carry") : speak(state, "early");
    return { ...continued, phase: "WAITING_FOR_PLAYER", roundNumber: state.roundNumber + 1, round: null, scored: false, verdict: false, appealHandled: false };
  }
  if (action.type !== "TICK") return state;
  if (state.phase === "SHAKING") return { ...state, phase: "REVEALING", line: "Shoot." };
  if (state.phase === "REVEALING" && state.round?.cheated) return { ...state, phase: "CHEATING", line: "" };
  if ((state.phase === "REVEALING" || state.phase === "CHEATING") && state.round && !state.scored) {
    const ai = state.ai + Number(state.round.outcome === "ai");
    const resolved = speak({ ...state, ai, you: state.you + Number(state.round.outcome === "you"), scored: true, phase: ai >= 5 ? "MATCH_OVER" : "RESOLVED" }, ai >= 5 ? "end" : state.round.cheated ? "cheat" : state.round.outcome);
    return ai >= 5 ? { ...resolved, endLine: resolved.line } : resolved;
  }
  if (state.phase === "COURT" && !state.verdict) return { ...state, verdict: true, line: "You should have just taken your L in peace." };
  return state;
}
// The view reads the original pose until the reveal hold is complete.
// Neither the hand components nor court can alter a score.
export function visibleHands(game: Game): { you: Hand; ai: Hand; hidden: boolean } {
  const hidden = game.phase === "WAITING_FOR_PLAYER" || game.phase === "SHAKING";
  if (hidden || !game.round) return { you: "rock", ai: "rock", hidden: true };
  return {
    you: game.round.you,
    ai: game.phase === "REVEALING" ? game.round.original : game.round.final,
    hidden: false,
  };
}





