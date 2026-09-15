# RPS

Local, rigged Rock Paper Scissors. Next.js App Router, TypeScript, React and CSS. No services or environment variables required.

## Run

npm install
npm run dev

## Verify

npm test
npm run lint
npm run build

Deploy as a standard Next.js project on Vercel.

## Structure

- `app/game.ts`: pure rules, round plan, guarded reducer, dialogue and central timing constants.
- `app/hand.tsx`: independently controlled SVG gesture/state presentation, ready for replacement with animated hand assets.
- `app/page.tsx`: client arena, cancellable timers and modal court review.
- `app/globals.css`: responsive game board and hand animations.

Original AI gestures are chosen uniformly at random. When its original hand loses, the AI allows the point with 10% probability at player scores 0-3; otherwise it visibly switches to the counter. At four player points it always switches. Draws remain draws. Each round scores once, after reveal/swap. Court never scores. Every fifth AI point enters match-over immediately and retains the final score and hands. A cheated final round remains appealable alongside RUN IT BACK; closing court returns to the completed match without adding points. Random play reaches an AI match victory with probability one, with no fixed round limit.

## Pass 2 motion

Hands use persistent SVG finger paths with matching cubic-curve commands, solid shaded planes, and mirrored orientation. CSS interpolates finger geometry without replacing the SVG or the individual fingers. The same component renders all three court exhibits.

All animation durations are in `TIMING` in `app/game.ts` and passed into CSS variables by the arena:

- 900 ms synchronized fist rhythm (three 300 ms beats).
- 360 ms original-hand reveal: 140 ms pose transition, then a 220 ms fully settled hold.
- Only on a cheat: an immediate 300 ms finger morph, with no anticipation delay or extra final-pose hold. Resolve as the morph finishes. No pre-cheat announcement; the reaction and revision label appear after scoring.
- Court review: 1200 ms. Opening: 180 ms. Verdict stamp: 260 ms.
- Score increment: 280 ms. Match victory: 450 ms.

Reduced-motion mode disables movement and geometry transitions while preserving the original-hand hold, visible change, and scoring order. Phase timers start after two animation-frame callbacks, giving the browser a paint opportunity before the hold begins. Both pending frames and the phase timeout are cancelled when the phase changes or the component unmounts. The CSS `d` transition requires a browser that supports SVG path interpolation; the SVG `d` attributes provide static-pose fallback.




## Dialogue and replay

Natural wins, cheated wins, player wins, draws, continuation, and match-end promises use separate rotating pools. Per-pool history survives RUN IT BACK to prevent immediate repeats. Scores, hand/round state, court, displayed dialogue, and match-over state reset. Cheating probability remains 90% below four player points and 100% at four.

