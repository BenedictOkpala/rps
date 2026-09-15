"use client";
import { useEffect, useReducer, useRef, type CSSProperties } from "react";
import { canAppeal, HANDS, initialGame, playerPointChance, reducer, TIMING, visibleHands, winner } from "./game";
import { HandVisual, type HandState } from "./hand";

const motionStyle = Object.fromEntries([
  ...Object.entries(TIMING).map(([name, duration]) => [`--${name}-duration`, `${duration}ms`]),
  ["--beat-duration", `${TIMING.shake / 3}ms`],
]) as CSSProperties;

export default function Home() {
  const [game, dispatch] = useReducer(reducer, initialGame);
  const dialog = useRef<HTMLDialogElement>(null);
  const controls = useRef<HTMLDivElement>(null);
  const { phase, round } = game;

  useEffect(() => {
    const delay = phase === "SHAKING" ? TIMING.shake
      : phase === "REVEALING" ? TIMING.reveal
      : phase === "CHEATING" ? TIMING.cheat
      : phase === "COURT" && !game.verdict ? TIMING.review : null;
    if (delay === null) return;
    const advance = () => dispatch({ type: "TICK" });
    // Start the phase clock after a paint opportunity. Even a busy render must
    // display the original matchup before its hold timer can advance the round.
    let timer: ReturnType<typeof setTimeout> | undefined;
    let secondFrame: number | undefined;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        timer = setTimeout(advance, delay);
      });
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      if (secondFrame !== undefined) cancelAnimationFrame(secondFrame);
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [phase, game.verdict, game.line, game.ai, round]);

  useEffect(() => {
    if (phase === "COURT" && !dialog.current?.open) dialog.current?.showModal();
    else if (phase !== "COURT" && dialog.current?.open) {
      dialog.current.close();
      controls.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    }
  }, [phase]);

  const { you: youHand, ai: aiHand, hidden } = visibleHands(game);
  const original = phase === "REVEALING";
  const handState = (side: "you" | "ai"): HandState => hidden
    ? phase === "SHAKING" ? "shake" : "idle"
    : phase === "CHEATING" && side === "ai" ? "cheating"
    : original ? side === "you" ? youHand : aiHand : "resolved";
  const next = () => dispatch({ type: "NEXT" });
  const appealActions = canAppeal(game) && <div className="appeal-actions"><button className="court-button" onClick={() => dispatch({ type: "COURT" })}>→ TAKE IT TO COURT</button><button className="carry" onClick={next}>→ I&apos;LL CHEST IT. LET&apos;S CARRY ON.</button></div>;
  const result = phase === "MATCH_OVER" ? "AI WINS."
    : phase === "RESOLVED" || phase === "COURT"
      ? round?.outcome === "draw" ? "DRAW." : round?.outcome === "you" ? "YOU WIN." : "AI WINS."
    : original && round
      ? winner(round.you, round.original) === "you" ? "YOUR WINNING HAND."
        : winner(round.you, round.original) === "draw" ? "SAME HAND." : "AI HAS THE WINNING HAND."
    : phase === "CHEATING" ? ""
    : phase === "SHAKING" ? "LOCKED IN." : "MAKE YOUR MOVE.";

  return (
    <main className={`board ${phase === "MATCH_OVER" ? "match-over" : ""}`} style={motionStyle} data-phase={phase}>
      <header>
        <div className="brand" aria-label="RPS">RPS<span>®</span></div>
        <div className="match-label">YOU VS AI<span>FIRST TO 5 WINS.</span></div>
        
      </header>
      <section className="arena" aria-label="Game arena">
        <div className="arena-scoreboard" aria-label="Match score">
        <div className="score player"><span>YOU</span><b key={`you-${game.you}`} className={game.you > 0 ? "score-pop" : ""}>{game.you}</b><div className="pips" aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <i className={index < game.you ? "filled" : ""} key={index} />)}</div></div>
        <div className="target"><b>ROUND {String(game.roundNumber).padStart(2, "0")}</b><span>FIRST TO 5</span></div>
        <div className="score opponent"><div className="pips" aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <i className={index < game.ai ? "filled" : ""} key={index} />)}</div><b key={`ai-${game.ai}`} className={game.ai > 0 ? "score-pop" : ""}>{game.ai}</b><span>AI</span></div>
      </div>
        <div className="fighters">
          <div className="fighter player">
            <div className="fighter-label"><b>YOU</b></div>
            <HandVisual side="you" gesture={youHand} state={handState("you")} />
            <span className="hand-name">{hidden ? phase === "SHAKING" ? "LOCKED IN" : "READY" : youHand.toUpperCase()}</span>
          </div>
          <div className="versus" aria-hidden="true">
            {phase === "SHAKING" ? <div className="rhythm">{["ROCK", "PAPER", "SCISSORS"].map((word, index) => <span key={word} style={{ animationDelay: `${index * TIMING.shake / 3}ms` }}>{word}</span>)}<b className="reduced-rhythm">READY</b></div>
              : original ? <span className="shoot">SHOOT</span> : <b>VS</b>}
          </div>
          <div className="fighter opponent">
            <div className="fighter-label"><b>AI</b></div>
            <HandVisual side="ai" gesture={aiHand} state={handState("ai")} />
            <span className="hand-name">{game.scored && round?.cheated
              ? <><s>{round.original.toUpperCase()}</s><span aria-hidden="true"> &rarr; </span>{aiHand.toUpperCase()}<em>REVISED</em></>
              : hidden ? "READY" : aiHand.toUpperCase()}</span>
          </div>
        </div>
        <div className="announcement" aria-live="polite" aria-atomic="true">
          <h1>{result}</h1>{game.line && <p><span>AI</span> “{game.line}”</p>}
        </div>
        <div className="controls" ref={controls}>
          {phase === "MATCH_OVER"
            ? <div className="match-actions">{appealActions}<button className="primary" onClick={() => dispatch({ type: "RESET" })}>→ RUN IT BACK</button></div>
            : phase === "RESOLVED"
              ? round?.cheated
                ? appealActions
                : <button className="primary" onClick={next}>NEXT ROUND <span aria-hidden="true">&rarr;</span></button>
              : <div className="choices">{HANDS.map((hand, index) => (
                <button key={hand} disabled={phase !== "WAITING_FOR_PLAYER"} aria-pressed={round?.you === hand} className={round?.you === hand ? "selected" : ""}
                  onClick={() => dispatch({ type: "CHOOSE", hand, original: HANDS[Math.floor(Math.random() * 3)], allow: Math.random() < playerPointChance(game.you) })}>
                  <span className="key">0{index + 1}</span>{hand.toUpperCase()}<span className="arrow" aria-hidden="true">{round?.you === hand ? "✓" : "↗"}</span>
                </button>
              ))}</div>}
        </div>
      </section>

      <dialog ref={dialog} aria-labelledby="court-title" onCancel={event => { event.preventDefault(); if (game.verdict) next(); }}>
        <div className="court-top"><span>RPS / DEPARTMENT OF FAIR PLAY</span><span>CASE {String(game.roundNumber).padStart(3, "0")}</span></div>
        <div className="court-heading"><div><p className="court-kicker">OFFICIAL PROCEEDINGS</p><h2 id="court-title" tabIndex={-1} autoFocus>CASE REVIEW</h2></div><span className="court-seal" aria-hidden="true">HOUSE<br />APPROVED</span></div>
        <p className="court-sub">Three exhibits. One very clear conclusion.</p>
        <div className="evidence">
          <div className="exhibit"><span>01 / YOUR CHOICE</span><HandVisual side="you" gesture={round?.you ?? "rock"} state="resolved" /><strong>{round?.you}</strong></div>
          <div className="exhibit"><span>02 / AI ORIGINAL</span><HandVisual side="ai" gesture={round?.original ?? "rock"} state="resolved" /><strong>{round?.original}</strong></div>
          <div className="exhibit"><span>03 / AI FINAL</span><HandVisual side="ai" gesture={round?.final ?? "rock"} state="resolved" /><strong>{round?.final}</strong></div>
        </div>
        <div className={`verdict ${game.verdict ? "issued" : ""}`} aria-live="polite">
          {game.verdict ? <><div className="verdict-stamp"><span>VERDICT / FINAL</span><h3>AI WINS.</h3></div><p><b>AI:</b> “You should have just taken your L in peace.”</p><small>Result confirmed. No additional point awarded.</small></>
            : <p className="reviewing">REVIEWING EVIDENCE<span>...</span></p>}
        </div>
        <button className="court-close" disabled={!game.verdict} onClick={next}><span aria-hidden="true">&rarr;</span>{game.verdict ? "CASE CLOSED. CARRY ON." : "REVIEW IN PROGRESS"}</button>
      </dialog>
    </main>
  );
}






